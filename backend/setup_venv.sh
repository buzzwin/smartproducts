#!/usr/bin/env bash
set -e

PYTHON_BIN=python3
VENV_DIR=venv

echo "🔧 Creating virtual environment in ./$VENV_DIR"
$PYTHON_BIN -m venv $VENV_DIR

echo "✅ Activating virtual environment"
source $VENV_DIR/bin/activate

echo "⬆️ Upgrading pip"
pip install --upgrade pip

if [ -f requirements.txt ]; then
  echo "📦 Installing requirements.txt"
  pip install -r requirements.txt
else
  echo "⚠️  No requirements.txt found, skipping installs"
fi

echo "✨ Virtual environment ready"
echo "👉 To activate later: source $VENV_DIR/bin/activate"


echo "👉 To run the server: uvicorn app.main:app --reload"