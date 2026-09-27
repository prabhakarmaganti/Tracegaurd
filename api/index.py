import os
import sys
import urllib.parse

# Determine root directory of the project
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app as _fastapi_app  # noqa: E402


class VercelPathMiddleware:
    """
    ASGI middleware ensuring incoming requests on Vercel reach the intended FastAPI route.
    Vercel rewrites forward subpaths via the '__path' query parameter or headers (x-matched-path / x-forwarded-uri).
    This middleware reconstructs the exact target route and cleans the query string so FastAPI routers match flawlessly.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            query_str = scope.get("query_string", b"").decode("latin1")
            params = urllib.parse.parse_qs(query_str, keep_blank_values=True)

            if "__path" in params:
                subpath = params.pop("__path")[0]
                new_qs = urllib.parse.urlencode(params, doseq=True)
                scope["query_string"] = new_qs.encode("latin1")
                if subpath in ("docs", "redoc", "openapi.json", "health", "favicon.ico", "api/index.py"):
                    target_path = "/" + subpath.lstrip("/")
                else:
                    target_path = "/api/" + subpath.lstrip("/")
                scope["path"] = target_path
                scope["raw_path"] = target_path.encode("latin1")
            else:
                headers = dict(scope.get("headers", []))
                matched_path = headers.get(b"x-matched-path", b"").decode("latin1")
                forwarded_uri = headers.get(b"x-forwarded-uri", b"").decode("latin1")
                real_path = (matched_path or forwarded_uri).split("?")[0]

                current_path = scope.get("path", "")
                if current_path in ("/api/index.py", "api/index.py", "/api/index", "/api", ""):
                    if real_path and real_path not in ("/api/index.py", "api/index.py"):
                        scope["path"] = real_path
                        scope["raw_path"] = real_path.encode("latin1")

                path = scope.get("path", "")
                if (
                    not path.startswith("/api")
                    and path not in ("/", "/docs", "/redoc", "/openapi.json", "/health", "/favicon.ico")
                ):
                    target = "/api/" + path.lstrip("/")
                    scope["path"] = target
                    scope["raw_path"] = target.encode("latin1")

        await self.app(scope, receive, send)


app = VercelPathMiddleware(_fastapi_app)
