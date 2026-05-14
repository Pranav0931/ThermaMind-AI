from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from data.synthetic_generator import generate_sensor_rows


if __name__ == "__main__":
    rows = generate_sensor_rows()
    print(f"Generated {len(rows)} synthetic demand rows. Replace this stub with XGBoost training.")
