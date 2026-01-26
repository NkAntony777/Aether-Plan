# Dev helper: always run backend in the 'fabu' conda environment (for development/testing only)
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

$ErrorActionPreference = 'Stop'

# Activate conda env for development/testing (do not use for production)
conda activate fabu

# Start backend dev server
npm run dev
