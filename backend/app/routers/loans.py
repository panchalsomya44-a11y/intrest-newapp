import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.loan import Loan, LoanTranche, Payment
from ..models.customer import Customer
from ..routers.customers import save_photo
from ..schemas.loan import (
    LoanOut, TrancheCreate, TrancheOut,
    PaymentCreate, PaymentOut, InterestRateUpdate
)
from ..utils.interest import calc_loan_summary

router = APIRouter(prefix="/api/loans", tags=["loans"])


def enrich_loan(loan: Loan) -> dict:
    summary = calc_loan_summary(loan.tranches, loan.payments, loan.interest_rate)
    d = {
        "id": loan.id,
        "loan_number": loan.loan_number,
        "customer_id": loan.customer_id,
        "collateral_description": loan.collateral_description,
        "collateral_description_hi": loan.collateral_description_hi,
        "collateral_metal_type": loan.collateral_metal_type,
        "collateral_metal_weight": loan.collateral_metal_weight,
        "collateral_photo_path": loan.collateral_photo_path,
        "interest_rate": loan.interest_rate,
        "is_active": loan.is_active,
        "created_at": loan.created_at,
        "closed_at": loan.closed_at,
        "notes": loan.notes,
        "tranches": loan.tranches,
        "payments": loan.payments,
        **summary,
    }
    return d


@router.post("/", response_model=LoanOut, status_code=201)
async def create_loan(
    customer_id: int = Form(...),
    collateral_description: Optional[str] = Form(None),
    collateral_description_hi: Optional[str] = Form(None),
    collateral_metal_type: Optional[str] = Form(None),
    collateral_metal_weight: Optional[float] = Form(None),
    collateral_photo: Optional[UploadFile] = File(None),
    interest_rate: Optional[float] = Form(3.0),
    notes: Optional[str] = Form(None),
    first_tranche_amount: float = Form(...),
    first_tranche_date: Optional[datetime] = Form(None),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    loan_num = "LOAN-" + str(uuid.uuid4())[:10].upper()
    collateral_photo_path = None
    if collateral_photo and collateral_photo.filename:
        ext = collateral_photo.filename.rsplit(".", 1)[-1] if "." in collateral_photo.filename else "jpg"
        collateral_photo_path = save_photo(await collateral_photo.read(), ext)

    loan = Loan(
        loan_number=loan_num,
        customer_id=customer_id,
        collateral_description=collateral_description,
        collateral_description_hi=collateral_description_hi,
        collateral_metal_type=collateral_metal_type,
        collateral_metal_weight=collateral_metal_weight,
        collateral_photo_path=collateral_photo_path,
        interest_rate=interest_rate or 3.0,
        notes=notes,
    )
    db.add(loan)
    db.flush()  # get loan.id

    tranche_date = first_tranche_date or datetime.now(timezone.utc)
    tranche = LoanTranche(
        loan_id=loan.id,
        amount=first_tranche_amount,
        disbursal_date=tranche_date,
    )
    db.add(tranche)
    db.commit()
    db.refresh(loan)
    return enrich_loan(loan)


@router.get("/", response_model=List[LoanOut])
def list_loans(
    customer_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Loan)
    if customer_id is not None:
        q = q.filter(Loan.customer_id == customer_id)
    if is_active is not None:
        q = q.filter(Loan.is_active == is_active)
    loans = q.offset(skip).limit(limit).all()
    return [enrich_loan(l) for l in loans]


@router.get("/{loan_id}", response_model=LoanOut)
def get_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return enrich_loan(loan)


@router.post("/{loan_id}/tranches", response_model=TrancheOut, status_code=201)
def add_tranche(loan_id: int, data: TrancheCreate, db: Session = Depends(get_db)):
    """Add more money to an existing loan. Interest on this amount starts from today (or provided date)."""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if not loan.is_active:
        raise HTTPException(status_code=400, detail="Loan is closed")

    disbursal_date = data.disbursal_date or datetime.now(timezone.utc)
    tranche = LoanTranche(
        loan_id=loan_id,
        amount=data.amount,
        disbursal_date=disbursal_date,
        notes=data.notes,
    )
    db.add(tranche)
    db.commit()
    db.refresh(tranche)
    return tranche


@router.post("/{loan_id}/payments", response_model=PaymentOut, status_code=201)
def add_payment(loan_id: int, data: PaymentCreate, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if not loan.is_active:
        raise HTTPException(status_code=400, detail="Loan is closed")

    payment_date = data.payment_date or datetime.now(timezone.utc)
    payment = Payment(
        loan_id=loan_id,
        amount=data.amount,
        payment_date=payment_date,
        notes=data.notes,
        interest_override=data.interest_override,
    )
    db.add(payment)
    db.flush()  # persist payment so it's included in summary

    # Refresh related data before summary calculation
    db.expire(loan, ["payments", "tranches"])
    db.refresh(loan)
    payments = db.query(Payment).filter(Payment.loan_id == loan_id).all()
    tranches = db.query(LoanTranche).filter(LoanTranche.loan_id == loan_id).all()
    summary = calc_loan_summary(tranches, payments, loan.interest_rate)
    if summary["outstanding"] <= 0 and loan.is_active:
        loan.is_active = False
        loan.closed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(payment)
    return payment


@router.patch("/{loan_id}/interest-rate", response_model=LoanOut)
def update_interest_rate(loan_id: int, data: InterestRateUpdate, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    loan.interest_rate = data.interest_rate
    db.commit()
    db.refresh(loan)
    return enrich_loan(loan)


@router.patch("/{loan_id}/close", response_model=LoanOut)
def close_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    loan.is_active = False
    loan.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(loan)
    return enrich_loan(loan)


@router.delete("/{loan_id}", status_code=204)
def delete_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    db.delete(loan)
    db.commit()
