from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    relation_name: Optional[str] = None
    relation_type: Optional[str] = None
    caste: Optional[str] = None
    village: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    first_name_hi: Optional[str] = None
    last_name_hi: Optional[str] = None
    relation_name_hi: Optional[str] = None
    caste_hi: Optional[str] = None
    village_hi: Optional[str] = None
    address_hi: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class CustomerOut(CustomerBase):
    id: int
    customer_id: str
    photo_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
