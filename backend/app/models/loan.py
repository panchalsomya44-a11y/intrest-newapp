from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    loan_number = Column(String(30), unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)

    # Collateral / security
    collateral_description = Column(Text)
    collateral_description_hi = Column(Text)

    interest_rate = Column(Float, default=3.0)   # % per month, adjustable per loan
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text)

    customer = relationship("Customer", back_populates="loans")
    # Multiple tranches per loan (each disbursal adds a tranche)
    tranches = relationship("LoanTranche", back_populates="loan", cascade="all, delete-orphan", order_by="LoanTranche.disbursal_date")
    payments = relationship("Payment", back_populates="loan", cascade="all, delete-orphan", order_by="Payment.payment_date")


class LoanTranche(Base):
    """Each time money is given against the same collateral, a new tranche is added.
       Interest on each tranche starts from its own disbursal_date."""
    __tablename__ = "loan_tranches"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    disbursal_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)

    loan = relationship("Loan", back_populates="tranches")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)

    # Negotiable interest: if set, only this much interest is cleared (rest waived).
    # None = clear full accrued interest first (default behavior).
    # 0    = entire payment goes to principal (full interest waived for this payment).
    # X    = clear exactly X as interest, rest goes to principal.
    interest_override = Column(Float, nullable=True)

    loan = relationship("Loan", back_populates="payments")
