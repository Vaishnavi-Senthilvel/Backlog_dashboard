"""
Backlog Dashboard — Flask Backend
pip install flask flask-cors pandas openpyxl python-dotenv
"""

import os, json, logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
from dotenv import load_dotenv
import io
import urllib.request

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"])

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

COL_MAP = {
    "Backlog ID": "id",
    "Requirement Title": "title",
    "Business Function": "function",
    "Team Responsible": "team",
    "Priority": "priority",
    "Planned End Date": "plannedEnd",
    "Actual End Date": "actualEnd",
    "Status": "status",
    "Remarks": "remarks",
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def parse_file(file) -> list[dict]:
    fname = file.filename.lower()
    if fname.endswith(".csv"):
        df = pd.read_csv(file)
    else:
        df = pd.read_excel(file, engine="openpyxl")
    df.columns = df.columns.str.strip()
    df.rename(columns=COL_MAP, inplace=True)
    for col in ("plannedEnd", "actualEnd"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce").dt.strftime("%Y-%m-%d").fillna("")
    
    # Convert entire DF to object type before filling NaNs to avoid dtype conflicts
    df = df.astype(object).fillna("")
    return df.to_dict(orient="records")


def ai_json(system: str, prompt: str) -> dict | list:
    text = ai_text(system, prompt, max_output_tokens=2000)
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def ai_text(system: str, prompt: str, max_output_tokens: int = 600) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": max_output_tokens, "temperature": 0.2},
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    if body.get("error"):
        raise RuntimeError(body["error"].get("message", "Gemini API error"))

    parts = body.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text


def compute_stats(rows: list[dict]) -> dict:
    total = len(rows)
    done = sum(1 for r in rows if r.get("status") in ("Completed", "Closed", "UAT Completed"))
    overdue = sum(1 for r in rows if r.get("status") == "Overdue")
    active = sum(1 for r in rows if r.get("status") in ("Dev In Progress", "UAT In Progress", "Solutioning"))
    pipeline = sum(1 for r in rows if r.get("status") == "Pipeline")
    critical = sum(1 for r in rows if r.get("priority") == "P0")
    rate = round(done / max(total, 1) * 100)
    teams = list(set(r.get("team", "") for r in rows if r.get("team")))
    statuses = {"Done": done, "Active": active, "Overdue": overdue, "Pipeline": pipeline}
    priorities = {p: sum(1 for r in rows if r.get("priority") == p)
                  for p in ("P0", "P1", "P2", "NA")}
    team_stats = {
        t: {
            "total": sum(1 for r in rows if r.get("team") == t),
            "completed": sum(1 for r in rows if r.get("team") == t and r.get("status") == "Completed"),
            "overdue": sum(1 for r in rows if r.get("team") == t and r.get("status") == "Overdue"),
        } for t in teams
    }
    return dict(total=total, completed=done, overdue=overdue, active=active,
                pipeline=pipeline, critical=critical, completionRate=rate,
                statuses=statuses, priorities=priorities, teamStats=team_stats)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@app.route("/api/upload", methods=["POST"])
def upload():
    """Parse Excel/CSV and return structured JSON rows + computed stats."""
    if "file" not in request.files:
        return jsonify({"error": "No file in request"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    try:
        rows = parse_file(file)
        return jsonify({"data": rows, "count": len(rows), "stats": compute_stats(rows)})
    except Exception as e:
        log.error("Upload error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats", methods=["POST"])
def stats():
    """Compute summary statistics from provided rows."""
    body = request.get_json(force=True)
    rows = body.get("data", [])
    return jsonify(compute_stats(rows))


@app.route("/api/ai/health-score", methods=["POST"])
def ai_health_score():
    """AI-generated backlog health score, grade, strengths and concerns."""
    body = request.get_json(force=True)
    rows = body.get("data", [])
    if not rows:
        return jsonify({"error": "No data"}), 400
    try:
        result = ai_json(
            "You are a senior project manager. Return ONLY valid JSON.",
            f"""Analyze this backlog. Return JSON with:
- healthScore: integer 0–100
- grade: "A"|"B"|"C"|"D"|"F"
- summary: 2-sentence plain text
- strengths: array of 2 short strings
- concerns: array of 2 short strings
Data: {json.dumps(rows[:80])}"""
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/risks", methods=["POST"])
def ai_risks():
    """Detect top risks in the backlog."""
    body = request.get_json(force=True)
    rows = body.get("data", [])
    try:
        result = ai_json(
            "You are a risk analyst. Return ONLY a valid JSON array.",
            f"""Identify top 5 project risks. Return JSON array, each item:
- id: string (e.g. R1)
- title: short risk name
- level: "P0"|"P1"|"P2"|"NA"
- description: 1 sentence
- affectedItems: array of backlog IDs
- mitigation: 1-sentence action
Data: {json.dumps(rows[:80])}"""
        )
        return jsonify({"risks": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/predict", methods=["POST"])
def ai_predict():
    """Predict realistic completion dates for active items."""
    body = request.get_json(force=True)
    rows = [r for r in body.get("data", []) if r.get("status") in ("In Progress", "Not Started")]
    if not rows:
        return jsonify({"predictions": []})
    try:
        result = ai_json(
            "You are a delivery forecasting expert. Return ONLY a valid JSON array.",
            f"""For each item, predict a realistic completion date. Return JSON array, each item:
- id: backlog ID
- title: item title
- predictedDate: YYYY-MM-DD string
- confidence: "High"|"Medium"|"Low"
- reasoning: 1 sentence
Data: {json.dumps(rows[:20])}"""
        )
        return jsonify({"predictions": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/recommend", methods=["POST"])
def ai_recommend():
    """Smart recommendation for a single backlog item."""
    body = request.get_json(force=True)
    item = body.get("item")
    if not item:
        return jsonify({"error": "No item provided"}), 400
    try:
        text = ai_text(
            "You are a senior project manager. Be specific and actionable.",
            f"Give a 2–3 sentence action recommendation for this backlog item:\n{json.dumps(item)}",
            max_output_tokens=300,
        )
        return jsonify({"recommendation": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/remark", methods=["POST"])
def ai_remark():
    """Auto-generate a professional remarks field entry for a backlog item."""
    body = request.get_json(force=True)
    item = body.get("item")
    if not item:
        return jsonify({"error": "No item provided"}), 400
    try:
        text = ai_text(
            "Write a professional, concise 1-sentence remarks entry for a project tracking system. No quotes.",
            f"Item: {json.dumps(item)}",
            max_output_tokens=150,
        ).strip('"')
        return jsonify({"remark": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/team-summary", methods=["POST"])
def ai_team_summary():
    """Generate AI summary for a specific team's workload."""
    body = request.get_json(force=True)
    team = body.get("team", "")
    rows = body.get("data", [])
    team_rows = [r for r in rows if r.get("team") == team]
    if not team_rows:
        return jsonify({"summary": "No data for this team."})
    try:
        text = ai_text(
            "You are a project manager. Write a plain 2–3 sentence summary.",
            f"Summarize team \"{team}\" workload and performance:\n{json.dumps(team_rows)}",
            max_output_tokens=200,
        )
        return jsonify({"team": team, "summary": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/ask", methods=["POST"])
def ai_ask():
    """Natural language Q&A over the backlog."""
    body = request.get_json(force=True)
    question = body.get("question", "").strip()
    rows = body.get("data", [])
    if not question:
        return jsonify({"error": "No question"}), 400
    try:
        text = ai_text(
            f"You are a project intelligence assistant. Answer concisely with specific data points. Backlog: {json.dumps(rows[:80])}",
            question,
            max_output_tokens=600,
        )
        return jsonify({"answer": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/export/csv", methods=["POST"])
def export_csv():
    """Export filtered rows as a CSV file."""
    body = request.get_json(force=True)
    rows = body.get("data", [])
    if not rows:
        return jsonify({"error": "No data"}), 400
    reverse_map = {v: k for k, v in COL_MAP.items()}
    df = pd.DataFrame(rows).rename(columns=reverse_map)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return send_file(
        io.BytesIO(buf.getvalue().encode()),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"backlog_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    )


@app.route("/api/export/excel", methods=["POST"])
def export_excel():
    """Export filtered rows as an Excel file."""
    body = request.get_json(force=True)
    rows = body.get("data", [])
    if not rows:
        return jsonify({"error": "No data"}), 400
    reverse_map = {v: k for k, v in COL_MAP.items()}
    df = pd.DataFrame(rows).rename(columns=reverse_map)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Backlog")
    buf.seek(0)
    return send_file(
        buf,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"backlog_export_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)



