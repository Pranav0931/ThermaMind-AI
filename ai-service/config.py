import os


MODEL_DIR = os.getenv("MODEL_DIR", "./saved_models")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
