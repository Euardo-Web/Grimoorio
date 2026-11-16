#!/usr/bin/env sh
set -eu
cd frontend
npm ci
npm run build
cd ../backend
pip install -r requirements.txt
