from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base

def generate_customer_id():
    return "CUST-" + str(uuid.uuid4())[:8].upper()

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(20), unique=True, index=True, default=generate_customer_id)

    # English fields
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    relation_name = Column(String(100))          # Father / Husband / Wife name
    relation_type = Column(String(20))           # "father" | "husband" | "wife"
    caste = Column(String(100))
    village = Column(String(100))
    state = Column(String(100))
    phone = Column(String(20))
    address = Column(Text)

    # Hindi fields
    first_name_hi = Column(String(200))
    last_name_hi = Column(String(200))
    relation_name_hi = Column(String(200))
    caste_hi = Column(String(200))
    village_hi = Column(String(200))
    address_hi = Column(Text)

    photo_path = Column(String(300))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    loans = relationship("Loan", back_populates="customer", cascade="all, delete-orphan")
