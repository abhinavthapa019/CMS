# ML Services (FastAPI)

This folder contains the Python-based ML microservice used by the Node backend for student performance prediction.

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `POST /predict` → `{ "predicted_grade": "B", "confidence": 0.82 }`

## Features (strict order)

Training and inference use the exact 7-feature set below (order is enforced server-side):

1. `G1`
2. `G2`
3. `absences`
4. `extracurricular`
5. `Mjob`
6. `Fjob`
7. `traveltime`

## Local setup (recommended)

> Recommended Python: **3.11 or 3.12**

```powershell
cd ml-services
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Train model

```powershell
cd ml-services
.\.venv\Scripts\Activate.ps1
python train.py
```

This will:

- Read raw sources: `../ml-service/cms data/mat2.csv` and `../ml-service/cms data/por2.csv`
- Generate processed training dataset: `data/student.csv` (7 features + letter-grade label)
- Write trained bundle: `model/random_forest.pkl`

## Run the API

```powershell
cd ml-services
.\.venv\Scripts\Activate.ps1
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Backend integration

Set this in `server/.env`:

```env
ML_SERVICE_URL=http://localhost:8000
```

The Node backend will call `POST {ML_SERVICE_URL}/predict`.
