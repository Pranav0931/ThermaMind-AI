from __future__ import annotations

from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from models.rl_optimizer import ARTIFACT, train_and_save


if __name__ == "__main__":
    train_and_save(force=True)
    print(f"Saved HVAC Q-network policy to {ARTIFACT}")
