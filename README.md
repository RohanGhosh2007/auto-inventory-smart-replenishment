# 📦 Auto Inventory — Smart Replenishment System

<p align="center">
  <h1 align="center">Auto Inventory — Smart Replenishment</h1>
  <p align="center">
    A smart inventory management system for demand forecasting, stock monitoring,
    low-stock detection and automated replenishment recommendations.
  </p>
</p>

---

## 📌 Overview

**Auto Inventory — Smart Replenishment System** is a web-based inventory management prototype designed to make stock management smarter and more efficient.

The system combines **inventory tracking, demand forecasting, safety stock analysis, reorder-point logic and replenishment recommendations** in a single platform.

Instead of relying completely on manual stock checking, the system analyzes available inventory and demand-related data to help identify potential stock risks and support timely replenishment decisions.

---

## 🎯 Problem Statement

Traditional inventory management can become difficult when the number of products increases.

Common problems include:

- 📉 Unexpected stock-outs
- 📦 Overstocking
- ⏳ Delayed replenishment
- 🔍 Manual stock monitoring
- 📊 Difficulty analyzing demand
- 🛡️ Maintaining appropriate safety stock
- 🚚 Considering supplier lead time while planning replenishment

A smarter system is needed to continuously monitor inventory and provide useful replenishment insights.

---

## 💡 Our Solution

Auto Inventory follows a complete inventory intelligence workflow:

```mermaid
flowchart LR
    A[📦 Product & Sales Data] --> B[📊 Demand Analysis]
    B --> C[🔮 Demand Forecasting]
    C --> D[📈 Stock Risk Analysis]
    D --> E[🛡️ Safety Stock]
    E --> F[📍 Reorder Point]
    F --> G{⚠️ Stock Risk?}
    G -->|No| H[🟢 Continue Monitoring]
    G -->|Yes| I[🔄 Replenishment Recommendation]
    I --> J[🛒 Purchase Order]
```

---

## ⭐ Key Features

### 📦 Inventory Management
- Add and manage products
- Track current stock
- Track unit price
- Organize products by category
- Monitor stock status

### 🔮 Demand Forecasting
- Uses available sales/demand data
- Generates future demand estimates
- Supports short-term inventory planning
- Helps identify possible future stock pressure

### 🛡️ Safety Stock
The system considers safety stock while analyzing inventory risk so that available quantity does not fall unnecessarily close to a critical level.

### 📍 Reorder Point
The system uses inventory conditions, demand and lead-time information to determine when replenishment should be considered.

### 🔄 Smart Replenishment
When a stock risk is detected, the system can provide a replenishment recommendation based on relevant inventory parameters.

### 🧾 Purchase Order Tracking
The system includes purchase-order related data so replenishment activity can be tracked.

---

## 🧠 How the System Works

```mermaid
flowchart TD
    A[Current Inventory] --> B[Demand Analysis]
    B --> C[Forecast Future Demand]
    C --> D[Check Lead Time]
    D --> E[Check Safety Stock]
    E --> F[Analyze Reorder Risk]

    F -->|Healthy Stock| G[🟢 Continue Monitoring]
    F -->|Low Stock| H[🟠 Replenishment Required]
    F -->|Critical Stock| I[🔴 Priority Replenishment]

    H --> J[Generate Recommendation]
    I --> J
    J --> K[Purchase / Restock]
```

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    U[👤 User] --> F[🖥️ Frontend]

    F --> API[⚡ FastAPI Backend]

    API --> INV[📦 Inventory Module]
    API --> FORE[🔮 Forecasting Module]
    API --> REP[🔄 Replenishment Module]

    INV --> DB[(🗄️ MySQL Database)]
    FORE --> DB
    REP --> DB

    DB --> P[Products]
    DB --> S[Sales]
    DB --> SU[Suppliers]
    DB --> PO[Purchase Orders]

    FORE --> REP
    INV --> REP
```

---

## 🔄 Application Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as FastAPI Backend
    participant D as MySQL Database
    participant M as Forecasting Module

    U->>F: Add / View Product
    F->>B: Send Request
    B->>D: Read Inventory & Sales Data
    D-->>B: Return Data
    B->>M: Analyze Demand
    M-->>B: Forecast Result
    B->>B: Analyze Stock Risk
    B-->>F: Inventory Status / Recommendation
    F-->>U: Display Result
```

---

## 📊 Inventory Decision Logic

| Parameter | Purpose |
|---|---|
| Current Stock | Shows the currently available quantity |
| Demand | Represents product consumption/sales |
| Forecast | Estimates future demand |
| Safety Stock | Provides an additional inventory buffer |
| Lead Time | Represents expected replenishment time |
| Reorder Point | Helps identify when replenishment should be considered |
| Order Quantity | Represents the recommended replenishment amount |

```text
                    ┌─────────────────┐
                    │  Current Stock  │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Demand Analysis │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Demand Forecast │
                    └────────┬────────┘
                             ↓
                 ┌───────────────────────┐
                 │ Safety Stock +        │
                 │ Lead Time Analysis    │
                 └───────────┬───────────┘
                             ↓
                    ┌─────────────────┐
                    │ Reorder Analysis │
                    └────────┬────────┘
                             ↓
                 ┌───────────┴───────────┐
                 ↓                       ↓
          🟢 Stock Healthy          ⚠️ Stock Risk
                 ↓                       ↓
           Keep Monitoring       Replenishment
                                      ↓
                              🛒 Recommendation
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Python, FastAPI |
| Database | MySQL |
| ORM | SQLAlchemy |
| Data Processing | Pandas, NumPy |
| Forecasting | Machine Learning / Data-driven Forecasting |
| API Server | Uvicorn |
| Configuration | Python-dotenv |

---

## 📁 Project Structure

```text
auto-inventory/
│
├── backend/
│   ├── __init__.py
│   ├── database.py
│   ├── forecasting.py
│   ├── inventory.py
│   ├── main.py
│   ├── models.py
│   ├── replenishment.py
│   └── schemas.py
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 🖥️ Screenshots

### 01

<img width="1600" height="900" alt="Screenshot (244)" src="https://github.com/user-attachments/assets/a0ca8449-10ed-4d25-ac47-75beafca3023" />

### 02 

<img width="1600" height="900" alt="Screenshot (245)" src="https://github.com/user-attachments/assets/784b72a5-6473-43dc-81e9-6610ec6eb1a4" />

### 03 

<img width="1600" height="900" alt="Screenshot (246)" src="https://github.com/user-attachments/assets/34a26824-3dc3-4859-bcaf-f2442e8abcc3" />

### 04 

<img width="1600" height="900" alt="Screenshot (247)" src="https://github.com/user-attachments/assets/6c193bbd-2cf9-44d8-ab1c-01dc028ea067" />

### 05 

<img width="1600" height="900" alt="Screenshot (248)" src="https://github.com/user-attachments/assets/22284359-af63-462d-8cb0-d5d84a89ff8c" />

### 06 

<img width="1600" height="900" alt="Screenshot (249)" src="https://github.com/user-attachments/assets/b4fa918c-6337-4825-897b-4b5ee249d1b7" />

### 07 

<img width="1600" height="900" alt="Screenshot (250)" src="https://github.com/user-attachments/assets/84206a9f-37e5-4299-aea4-c4c591705788" />

### 08 

<img width="1600" height="900" alt="Screenshot (251)" src="https://github.com/user-attachments/assets/c0d65f7f-8f73-453a-9421-6ecb1d992c1b" />

### 09 

<img width="1600" height="900" alt="Screenshot (252)" src="https://github.com/user-attachments/assets/894b7130-d5bd-48d5-86bc-78c9c472b9ce" />

### 10 

<img width="1600" height="900" alt="Screenshot (253)" src="https://github.com/user-attachments/assets/abd4ba86-2139-4a2b-8c96-7e7b90fb18a0" />

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/RohanGhosh2007/auto-inventory-smart-replenishment.git
cd auto-inventory-smart-replenishment
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure MySQL

Create the database:

```sql
CREATE DATABASE auto_inventory;
```

Create a `.env` file based on `.env.example`:

```env
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auto_inventory
```

> ⚠️ Never upload your real `.env` file or database password to GitHub.

### 4. Start the backend

```bash
python -m uvicorn backend.main:app --reload
```

### 5. Open the application

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 🧪 Example Inventory Scenario

```text
Current Stock   → 45 units
Safety Stock    → 50 units
Lead Time       → 4 days
Demand          → Increasing
Stock Status    → Low
```

The system can detect that the current stock has reached a risky level and generate a replenishment recommendation.

This allows the inventory manager to take action before the product reaches zero stock.

---

## 🔐 Security

Sensitive information such as:

- Database passwords
- `.env` files
- Local database files

should not be committed to the public repository.

---

## 🔮 Future Improvements

- ☁️ Cloud deployment
- 📱 Responsive mobile dashboard
- 🔔 Real-time inventory notifications
- 🧾 Automated purchase-order generation
- 📈 Advanced forecasting models
- 🏪 Multi-store inventory management
- 👥 Role-based authentication
- 📦 Supplier performance analysis
- 📊 Advanced business analytics
- 🔄 Automated replenishment workflows

---

## 🎯 Project Goals

The main goals of the project are to:

- Reduce stock-out risk
- Reduce unnecessary overstock
- Improve inventory visibility
- Support demand-based planning
- Automate repetitive inventory analysis
- Provide timely replenishment recommendations
- Create a scalable foundation for smart inventory management

---

## 👨‍💻 Project

**Auto Inventory — Smart Replenishment System**

Developed as a software prototype demonstrating inventory monitoring, demand forecasting and smart replenishment.

---

## 📄 License

This project is developed for educational and prototype purposes.
