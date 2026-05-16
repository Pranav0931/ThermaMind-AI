# ThermaMind AI

**Warehouse HVAC Intelligence Platform**

ThermaMind AI is an advanced, full-stack warehouse climate management platform. It integrates a React Native (Expo) mobile frontend, a real-time Node.js backend, and a dedicated Python AI microservice to provide intelligent HVAC monitoring, forecasting, anomaly detection, and energy optimization.

## 🚀 Features

The platform offers four main modules:

1. **Dashboard:** Live sensor data visualization (temperature, humidity, CO2, occupancy, efficiency) and real-time alerts.
2. **Energy:** HVAC optimization, carbon reduction tracking, and manual/AI-driven fan and compressor controls.
3. **Insights:** Climate stability scoring, occupancy forecasting, and AI-generated operational recommendations using Gemini NLG.
4. **Schedule:** Global target profiles, daily schedules, and forecast simulation capabilities.

## 🧠 AI Capabilities

The intelligence layer is powered by a dedicated Python FastAPI microservice:

* **Occupancy Forecaster (LSTM):** Predicts warehouse zone occupancy 15-60 minutes ahead using deep learning.
* **Cooling Demand Predictor (XGBoost):** Forecasts HVAC energy demand based on real-time environmental conditions.
* **Anomaly Detector (Isolation Forest):** Identifies unusual sensor patterns (e.g., temperature spikes, CO2 surges) to trigger pre-emptive alerts.
* **RL HVAC Optimizer (DQN):** A Deep Q-Network reinforcement learning agent that optimizes HVAC setpoints to balance energy savings and comfort.
* **Recommendation Engine:** Combines rule-based logic with the Gemini API to generate human-readable operational recommendations.

## 🏗️ Architecture

* **Frontend:** React Native (Expo)
* **Backend:** Node.js (Express), Socket.IO for real-time updates, Prisma ORM
* **AI Service:** Python (FastAPI), PyTorch, scikit-learn, XGBoost, Google Generative AI
* **Database:** PostgreSQL

## 🛠️ Getting Started

### Prerequisites
* Node.js & npm
* Python 3.10+
* Docker & Docker Compose (for database and full-stack orchestration)
* Expo CLI

### 1. Database & Infrastructure
Run the provided `docker-compose.yml` to spin up PostgreSQL and Redis (if configured):
```bash
docker-compose up -d postgres
```

### 2. Backend Setup
Navigate to the `backend` directory, install dependencies, and start the server:
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 3. AI Service Setup
Navigate to the `ai-service` directory, install Python dependencies, and start the FastAPI server:
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*Note: Make sure to set your `GEMINI_API_KEY` in the `.env` file.*

### 4. Frontend Setup
Navigate to the `frontend` directory, install dependencies, and start the Expo development server:
```bash
cd frontend
npm install
npx expo start
```

## 📄 License

MIT License
