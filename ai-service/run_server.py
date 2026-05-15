"""Startup script that pre-loads torch before uvicorn to avoid DLL issues on Windows."""
from __future__ import annotations

import os
import sys

# Ensure torch DLLs are on the PATH before any imports
torch_lib = os.path.join(
    sys.prefix, "Lib", "site-packages", "torch", "lib"
)
if os.path.isdir(torch_lib):
    os.add_dll_directory(torch_lib)
    os.environ["PATH"] = torch_lib + os.pathsep + os.environ.get("PATH", "")

import torch  # noqa: E402 — must load after DLL directory is set

print(f"PyTorch {torch.__version__} loaded")

# Now start uvicorn
import uvicorn  # noqa: E402

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, log_level="info")
