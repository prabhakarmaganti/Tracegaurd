import os
import sys

# Determine root directory of the project
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app as _fastapi_app  # noqa: E402


class VercelPathMiddleware:
    """
    ASGI middleware ensuring incoming requests on Vercel reach the intended FastAPI route.
    When Vercel uses URL rewrites to api/index.py, it stores the original request URL in
    the x-matched-path or x-forwarded-uri header, while scope['path'] may be set to '/api/index.py'.
    This middleware restores the original path so FastAPI's router matches correctly.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope.get("headers", []))
            matched_path = headers.get(b"x-matched-path", b"").decode("latin1")
            forwarded_uri = headers.get(b"x-forwarded-uri", b"").decode("latin1")

            real_path = matched_path or forwarded_uri
            current_path = scope.get("path", "")

            # If Vercel rewrote the path to the function file itself, restore the real target path
            if current_path in ("/api/index.py", "api/index.py", "/api/index", "/api", ""):
                if real_path:
                    clean_path = real_path.split("?")[0]
                    scope["path"] = clean_path
                    scope["raw_path"] = clean_path.encode("latin1")

            # If the path is missing the /api prefix (e.g. /dashboard/summary), prepend /api
            path = scope.get("path", "")
            if (
                not path.startswith("/api")
                and path not in ("/", "/docs", "/redoc", "/openapi.json", "/health", "/favicon.ico")
            ):
                new_path = "/api" + (path if path.startswith("/") else f"/{path}")
                scope["path"] = new_path
                scope["raw_path"] = new_path.encode("latin1")

        await self.app(scope, receive, send)


app = VercelPathMiddleware(_fastapi_app)
