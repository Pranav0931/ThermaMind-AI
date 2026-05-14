from __future__ import annotations

import os
from pathlib import Path


MODEL_DIR = Path(os.getenv("MODEL_DIR", "./saved_models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)

LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
RANDOM_SEED = int(os.getenv("RANDOM_SEED", "42"))
