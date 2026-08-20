from flask import Flask, send_file, Response, request, jsonify
import os
import psycopg2
import psycopg2.extras

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgres://tracker_user:muvkyxfb526m86eeip53@easypanel.v4lisboatech.com.br:2412/lp_tracker?sslmode=disable"
)


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


# ============================================================
# STATIC FILES
# ============================================================

@app.route("/v1/script.js")
def serve_script():
    path = os.path.join(BASE_DIR, "script.js")
    response = send_file(path, mimetype="application/javascript")
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Cache-Control"] = "public, max-age=300"
    return response


@app.route("/README.md")
def serve_readme():
    path = os.path.join(BASE_DIR, "README.md")
    return send_file(path, mimetype="text/plain")


@app.route("/health")
def health():
    return Response("ok\n", mimetype="text/plain")


# ============================================================
# CORS
# ============================================================

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/v1/events", methods=["OPTIONS"])
def options_events():
    return Response("", status=204)


# ============================================================
# EVENTS ENDPOINT
# ============================================================

@app.route("/v1/events", methods=["POST"])
def receive_event():
    payload = request.get_json(silent=True)

    if not payload:
        return jsonify({"error": "Invalid JSON"}), 400

    # ----------------------------------------------------------
    # Validate required fields
    # ----------------------------------------------------------

    required = ["event_id", "event", "timestamp", "site_id", "session"]
    missing = [f for f in required if f not in payload]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    session_data = payload.get("session")
    if not isinstance(session_data, dict) or "id" not in session_data:
        return jsonify({"error": "session.id is required"}), 400

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ----------------------------------------------------------
        # Step 1: Resolve site
        # ----------------------------------------------------------

        cur.execute(
            "SELECT id FROM sites WHERE site_key = %s AND active = TRUE",
            (payload["site_id"],)
        )
        site = cur.fetchone()

        if not site:
            conn.rollback()
            return jsonify({"error": "Site not found or inactive"}), 404

        site_id = site["id"]

        # ----------------------------------------------------------
        # Step 2: Resolve or create session
        # ----------------------------------------------------------

        tracker_session_id = session_data["id"]

        cur.execute(
            """SELECT id FROM sessions
               WHERE site_id = %s AND session_id = %s""",
            (site_id, tracker_session_id)
        )
        existing_session = cur.fetchone()

        if existing_session:
            # Update last_activity
            cur.execute(
                """UPDATE sessions
                   SET last_activity_at = %s, updated_at = NOW()
                   WHERE id = %s""",
                (payload["timestamp"], existing_session["id"])
            )
            db_session_id = existing_session["id"]
        else:
            # Create new session
            page = payload.get("page", {})
            device = payload.get("device", {})

            cur.execute(
                """INSERT INTO sessions
                   (session_id, site_id, started_at, last_activity_at,
                    landing_url, landing_path, referrer,
                    user_agent, language,
                    screen_width, screen_height,
                    viewport_width, viewport_height)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING id""",
                (
                    tracker_session_id,
                    site_id,
                    session_data.get("started_at"),
                    session_data.get("last_activity"),
                    page.get("url"),
                    page.get("path"),
                    page.get("referrer"),
                    device.get("user_agent"),
                    device.get("language"),
                    device.get("screen_width"),
                    device.get("screen_height"),
                    device.get("viewport_width"),
                    device.get("viewport_height"),
                )
            )
            db_session_id = cur.fetchone()["id"]

        # ----------------------------------------------------------
        # Step 3: Insert event
        # ----------------------------------------------------------

        page = payload.get("page", {})

        cur.execute(
            """INSERT INTO events
               (event_id, site_id, session_id, event_name, timestamp,
                page_url, page_path, page_title, data)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (event_id) DO NOTHING""",
            (
                payload["event_id"],
                site_id,
                db_session_id,
                payload["event"],
                payload["timestamp"],
                page.get("url"),
                page.get("path"),
                page.get("title"),
                psycopg2.extras.Json(payload.get("data")) if payload.get("data") else None,
            )
        )

        conn.commit()
        cur.close()

        return jsonify({"status": "ok"}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        app.logger.error(f"Error processing event: {e}")
        return jsonify({"error": "Internal server error"}), 500

    finally:
        if conn:
            conn.close()

