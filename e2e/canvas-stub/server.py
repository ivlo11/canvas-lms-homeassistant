"""A stub Canvas with one student, for the end-to-end tests.

It answers the four requests the integration makes, in the shapes Canvas sends,
and nothing else. Standard library only, so it runs in a plain Python image.
"""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from typing import Any
from urllib.parse import urlsplit

TOKEN = os.environ.get("CANVAS_STUB_TOKEN", "e2e-token")
BASE = os.environ.get("CANVAS_STUB_URL", "http://canvas:8080")

STUDENT = {"id": 21, "name": "Alice Student"}

COURSE = {
    "id": 101,
    "name": "Algebra",
    "workflow_state": "available",
    "start_at": None,
    "end_at": None,
    "html_url": f"{BASE}/courses/101",
    "term": {"id": 1, "name": "Fall"},
    "teachers": [{"id": 900, "display_name": "Ms Rivera", "anonymous_id": "x"}],
    "enrollments": [
        {
            "type": "student",
            "role": "StudentEnrollment",
            "user_id": STUDENT["id"],
            "enrollment_state": "active",
            "computed_current_score": 91.5,
            "computed_current_grade": "A-",
        }
    ],
}

SUBMISSION = {
    "id": 9001,
    "assignment_id": 1,
    "user_id": STUDENT["id"],
    "workflow_state": "unsubmitted",
    "submitted_at": None,
    "grader_id": None,
    "score": None,
    "late_policy_status": None,
    "custom_grade_status_id": None,
    "cached_due_date": "2099-01-01T23:59:00Z",
    "seconds_late": 0,
    "missing": False,
    "excused": False,
    "assignment": {
        "id": 1,
        "name": "Quadratics worksheet",
        "due_at": "2099-01-01T23:59:00Z",
        "points_possible": 10.0,
        "course_id": COURSE["id"],
        "html_url": f"{BASE}/courses/101/assignments/1",
        "submission_types": ["online_upload"],
        "locked_for_user": False,
        "is_quiz_lti_assignment": False,
    },
}

ROUTES: dict[str, Any] = {
    "/api/v1/users/self": STUDENT,
    "/api/v1/users/self/observees": [],
    f"/api/v1/users/{STUDENT['id']}/courses": [COURSE],
    f"/api/v1/courses/{COURSE['id']}/students/submissions": [SUBMISSION],
}


class Handler(BaseHTTPRequestHandler):
    """Answer the known routes for the known token."""

    def do_GET(self) -> None:
        """Return a route's JSON, 401 for another token, 404 otherwise."""
        path = urlsplit(self.path).path
        if path == "/health":
            self._send(200, {"ok": True})
        elif self.headers.get("Authorization") != f"Bearer {TOKEN}":
            self._send(401, {"errors": [{"message": "Invalid access token."}]})
        elif path in ROUTES:
            self._send(200, ROUTES[path])
        else:
            self._send(
                404, {"errors": [{"message": "The specified resource does not exist."}]}
            )

    def _send(self, status: int, body: Any) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
