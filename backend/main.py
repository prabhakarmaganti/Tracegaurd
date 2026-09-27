import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import Base, engine
from backend.routers import (
    audit,
    batches,
    dashboard,
    defects,
    master_data,
    materials,
    recalls,
    reports,
    trace,
)
from backend.seed_data import seed_database

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TraceGuard",
    description="Manufacturing Traceability & Recall Containment System",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(dashboard.router)
app.include_router(trace.router)
app.include_router(batches.router)
app.include_router(defects.router)
app.include_router(recalls.router)
app.include_router(materials.router)
app.include_router(master_data.router)
app.include_router(reports.router)
app.include_router(audit.router)

# Mount static assets from frontend directory
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cwd = os.getcwd()
frontend_candidates = [
    os.path.join(root_dir, "frontend"),
    os.path.join(cwd, "frontend"),
]
frontend_dir = next((p for p in frontend_candidates if os.path.isdir(p)), os.path.join(root_dir, "frontend"))

if os.path.isdir(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
    app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")


@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        seed_database()
    except Exception as e:
        print(f"Database startup initialization note: {e}")


@app.get("/")
def serve_index():
    index_candidates = [
        os.path.join(frontend_dir, "index.html"),
        os.path.join(root_dir, "frontend", "index.html"),
        os.path.join(cwd, "frontend", "index.html"),
    ]
    for candidate in index_candidates:
        if os.path.isfile(candidate):
            return FileResponse(candidate)
    return FileResponse(os.path.join(frontend_dir, "index.html"))


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "TraceGuard", "version": "1.0.0"}
