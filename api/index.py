import os
import sys

# Determine root directory of the project
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Import the FastAPI ASGI application directly from backend package
from backend.main import app  # noqa: E402
