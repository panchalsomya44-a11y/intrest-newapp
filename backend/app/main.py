import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine
from .models import customer, loan   # noqa: side-effect – register models
from .database import Base
from .routers import customers, loans
from .routers.ocr import router as ocr_router
from .config import settings

# Create all tables
Base.metadata.create_all(bind=engine)

# Add new columns that may not exist in older DBs (safe migration)
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS interest_override FLOAT"))
        conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS scanned_document_path VARCHAR(300)"))
        conn.execute(text("ALTER TABLE loans ADD COLUMN IF NOT EXISTS collateral_metal_type VARCHAR(20)"))
        conn.execute(text("ALTER TABLE loans ADD COLUMN IF NOT EXISTS collateral_metal_weight FLOAT"))
        conn.execute(text("ALTER TABLE loans ADD COLUMN IF NOT EXISTS collateral_photo_path VARCHAR(300)"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title="Money Lending App API",
    description="Loan management system with multi-tranche interest calculation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos (only if using local storage)
if not settings.USE_CLOUD_STORAGE:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(customers.router)
app.include_router(loans.router)
app.include_router(ocr_router)

@app.get("/")
def root():
    return {"message": "Money Lending API is running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}
