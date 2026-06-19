# ऋण प्रबंधन | Money Lending App

A full-stack bilingual (English + Hindi) loan management system.

## Features

- **Customer Management** — Register customers with photos (webcam or upload)
- **Bilingual** — All fields support English + Hindi (Devanagari)
- **Unique Customer IDs** — Auto-generated `CUST-XXXXXXXX`
- **Multi-Tranche Loans** — Add more money to an existing loan anytime; each tranche earns interest from its own date
- **Adjustable Interest Rate** — Default 3%/month, changeable per loan
- **Interest Formula** — Simple interest: `Principal × Rate × Days/30`
- **Search & Filters** — Filter by name, ID, phone, village, state, caste
- **Collateral Tracking** — Record what was pledged
- **Payment Recording** — Track repayments
- **Dashboard** — Charts and summary stats
- **Docker Compose** — One command to run everything

## Quick Start

```bash
docker compose up --build
```

Then open: http://localhost

## Development

**Backend (FastAPI):**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend (React + Vite):**
```bash
cd frontend
npm install
npm run dev
```

## Interest Calculation

Each loan can have multiple tranches (disbursals). For example:

- Day 0: Gave ₹1000 → interest starts from Day 0
- Day 15: Gave ₹500 more → interest on this ₹500 starts from Day 15

Formula per tranche:
```
Interest = Amount × (Rate/100) × (Days/30)
```

Outstanding = Total Principal + Total Interest - Total Payments

## API Docs

Visit http://localhost:8000/docs for interactive Swagger UI.
