# Auto Inventory — Smart Replenishment

A smart inventory management system for demand forecasting, stock monitoring,
inventory analysis, and automated replenishment recommendations.

## Features

- Product and stock management
- Sales tracking
- Inventory summary
- Machine-learning-based demand forecasting
- Replenishment calculation
- Purchase-order management
- FastAPI backend with MySQL database
- HTML, CSS, and JavaScript frontend

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python, FastAPI
- Database: MySQL
- ORM: SQLAlchemy
- Forecasting: Python / machine-learning-based forecasting logic

## Run Locally

1. Create a `.env` file from `.env.example`.
2. Put your MySQL connection details in `.env`.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the backend:

```bash
python -m uvicorn backend.main:app --reload
```

5. Open:

`http://127.0.0.1:8000`
