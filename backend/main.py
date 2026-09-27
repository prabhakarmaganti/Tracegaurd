import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import (
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
from app.seed_data import seed_database

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

# Mount static assets (supports both 'frontend' and 'static' directory structures)
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_candidates = [
    os.path.join(root_dir, "frontend"),
    os.path.join(root_dir, "static"),
]
static_dir = next((p for p in static_candidates if os.path.isdir(p)), os.path.join(root_dir, "frontend"))

if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    app.mount("/frontend", StaticFiles(directory=static_dir), name="frontend")


@app.on_event("startup")
def startup_event():
    seed_database()


@app.get("/")
def serve_index():
    index_candidates = [
        os.path.join(static_dir, "index.html"),
        os.path.join(root_dir, "frontend", "index.html"),
        os.path.join(root_dir, "static", "index.html"),
    ]
    for candidate in index_candidates:
        if os.path.isfile(candidate):
            return FileResponse(candidate)
    return FileResponse(os.path.join(static_dir, "index.html"))


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "TraceGuard", "version": "1.0.0"}
