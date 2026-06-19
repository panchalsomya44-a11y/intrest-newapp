from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class TrancheCreate(BaseModel):
    amount: float
    disbursal_date: Optional[datetime] = None
    notes: Optional[str] = None

class TrancheOut(BaseModel):
    id: int
    amount: float
    disbursal_date: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    amount: float
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None
    # Negotiated interest: how much of the payment should clear interest.
    # None  → auto (clear all accrued interest first, rest to principal)
    # 0     → full payment goes to principal (interest fully waived)
    # X     → clear exactly X as interest, rest goes to principal
    interest_override: Optional[float] = None

class PaymentOut(BaseModel):
    id: int
    amount: float
    payment_date: datetime
    notes: Optional[str] = None
    interest_override: Optional[float] = None

    class Config:
        from_attributes = True

class LoanCreate(BaseModel):
    customer_id: int
    collateral_description: Optional[str] = None
    collateral_description_hi: Optional[str] = None
    interest_rate: Optional[float] = 3.0
    notes: Optional[str] = None
    first_tranche_amount: float
    first_tranche_date: Optional[datetime] = None

class LedgerEntry(BaseModel):
    type: str
    date: str
    description: str
    amount: Optional[float] = None
    interest: Optional[float] = None
    interest_cleared: Optional[float] = None
    principal_cleared: Optional[float] = None
    excess: Optional[float] = None
    principal_balance: float
    interest_balance: float

class LoanOut(BaseModel):
    id: int
    loan_number: str
    customer_id: int
    collateral_description: Optional[str] = None
    collateral_description_hi: Optional[str] = None
    interest_rate: float
    is_active: bool
    created_at: datetime
    closed_at: Optional[datetime] = None
    notes: Optional[str] = None
    tranches: List[TrancheOut] = []
    payments: List[PaymentOut] = []
    # Computed fields from running balance engine
    total_principal: Optional[float] = None
    total_interest: Optional[float] = None
    total_paid: Optional[float] = None
    interest_paid: Optional[float] = None
    principal_paid: Optional[float] = None
    principal_balance: Optional[float] = None   # remaining unpaid principal
    interest_balance: Optional[float] = None    # accrued interest not yet paid
    outstanding: Optional[float] = None
    ledger: Optional[List[Any]] = None

    class Config:
        from_attributes = True

class InterestRateUpdate(BaseModel):
    interest_rate: float
