#!/usr/bin/env bash
set -euo pipefail

# Build script for local WSL/Docker environment to produce a Linux-compatible
# deployment zip for the create-gallery Lambda. This installs Python deps into
# the `python/` target directory (Lambda-compatible layout) and produces
# `.serverless/createGalleryFunction.zip` containing the handler and the `python/` dir.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Output paths
mkdir -p .serverless || true
ZIP_PATH=.serverless/createGalleryFunction.zip

echo "Building in: $ROOT_DIR"

# Ensure python target directory is clean
rm -rf python
mkdir -p python

# Use Python 3.9 in WSL. Adjust if your distro has different python binary name.
PYTHON_BIN=${PYTHON_BIN:-python3.9}

echo "Using python: $($PYTHON_BIN --version 2>&1)"

echo "Installing requirements into ./python ..."
# install pip and wheel if missing
$PYTHON_BIN -m pip install --upgrade pip wheel
$PYTHON_BIN -m pip install --upgrade setuptools

# Some system libs may be required for PyMuPDF; install them in your WSL distro
# (example for Ubuntu): sudo apt-get update && sudo apt-get install -y libgl1 libxrender1 libxext6 fontconfig

# Install into target directory
$PYTHON_BIN -m pip install --target=python -r requirements.txt

echo "Stripping .pyc and tests to reduce size..."
find python -name "*.pyc" -delete || true
find python -type d -name "tests" -prune -exec rm -rf {} + || true

# Prepare package directory where installed packages are placed at the zip root
rm -rf package
mkdir -p package
echo "Copying handler and installed packages into package/..."
cp lambda_function.py package/
# Copy contents of python/ (installed packages) into package/
shopt -s dotglob || true
cp -r python/* package/ || true

mkdir -p .serverless
rm -f "$ZIP_PATH"

echo "Creating zip $ZIP_PATH with packages at root (this may be large due to native libs)"
(cd package && zip -r9 "../$ZIP_PATH" . -x "*/__pycache__/*")

echo "Build complete. Zip created at: $ZIP_PATH"
echo "You can now upload this zip to your Lambda function or use the deploy script."
