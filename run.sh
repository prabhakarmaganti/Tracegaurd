#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Setting up venv..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

echo "Seeding initial database if needed..."
./venv/bin/python -m app.seed_data

echo "Starting TraceGuard on http://localhost:8000..."
exec ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
