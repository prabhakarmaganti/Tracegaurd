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

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.on_event("startup")
def startup_event():
    seed_database()


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(static_dir, "index.html"))


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "TraceGuard", "version": "1.0.0"}
