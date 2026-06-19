import os
import uuid
import base64
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models.customer import Customer
from ..schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate
from ..config import settings

router = APIRouter(prefix="/api/customers", tags=["customers"])

def save_photo(data: bytes, ext: str = "jpg") -> str:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    return filename


@router.post("/", response_model=CustomerOut, status_code=201)
async def create_customer(
    first_name: str = Form(...),
    last_name: str = Form(...),
    relation_name: Optional[str] = Form(None),
    relation_type: Optional[str] = Form(None),
    caste: Optional[str] = Form(None),
    village: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    first_name_hi: Optional[str] = Form(None),
    last_name_hi: Optional[str] = Form(None),
    relation_name_hi: Optional[str] = Form(None),
    caste_hi: Optional[str] = Form(None),
    village_hi: Optional[str] = Form(None),
    address_hi: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    photo_base64: Optional[str] = Form(None),   # webcam snapshot
    custom_customer_id: Optional[str] = Form(None),  # user-provided ID
    db: Session = Depends(get_db),
):
    # Use provided ID or generate one
    if custom_customer_id and custom_customer_id.strip():
        cid = custom_customer_id.strip().upper()
        # Check uniqueness
        existing = db.query(Customer).filter(Customer.customer_id == cid).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Customer ID '{cid}' already exists")
    else:
        cid = "CUST-" + str(uuid.uuid4())[:8].upper()

    photo_path = None
    if photo and photo.filename:
        ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
        photo_path = save_photo(await photo.read(), ext)
    elif photo_base64:
        # strip data:image/...;base64, prefix if present
        if "," in photo_base64:
            photo_base64 = photo_base64.split(",", 1)[1]
        photo_path = save_photo(base64.b64decode(photo_base64), "jpg")

    customer = Customer(
        customer_id=cid,
        first_name=first_name,
        last_name=last_name,
        relation_name=relation_name,
        relation_type=relation_type,
        caste=caste,
        village=village,
        state=state,
        phone=phone,
        address=address,
        first_name_hi=first_name_hi,
        last_name_hi=last_name_hi,
        relation_name_hi=relation_name_hi,
        caste_hi=caste_hi,
        village_hi=village_hi,
        address_hi=address_hi,
        photo_path=photo_path,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    caste: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Customer)
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Customer.first_name.ilike(like),
                Customer.last_name.ilike(like),
                Customer.phone.ilike(like),
                Customer.customer_id.ilike(like),
                Customer.village.ilike(like),
                Customer.caste.ilike(like),
                Customer.first_name_hi.ilike(like),
                Customer.last_name_hi.ilike(like),
            )
        )
    if state:
        q = q.filter(Customer.state.ilike(f"%{state}%"))
    if village:
        q = q.filter(Customer.village.ilike(f"%{village}%"))
    if caste:
        q = q.filter(Customer.caste.ilike(f"%{caste}%"))
    if customer_id:
        q = q.filter(Customer.customer_id.ilike(f"%{customer_id}%"))
    return q.offset(skip).limit(limit).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.put("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: int,
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    relation_name: Optional[str] = Form(None),
    relation_type: Optional[str] = Form(None),
    caste: Optional[str] = Form(None),
    village: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    first_name_hi: Optional[str] = Form(None),
    last_name_hi: Optional[str] = Form(None),
    relation_name_hi: Optional[str] = Form(None),
    caste_hi: Optional[str] = Form(None),
    village_hi: Optional[str] = Form(None),
    address_hi: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    photo_base64: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    fields = dict(
        first_name=first_name, last_name=last_name, relation_name=relation_name,
        relation_type=relation_type, caste=caste, village=village, state=state,
        phone=phone, address=address, first_name_hi=first_name_hi,
        last_name_hi=last_name_hi, relation_name_hi=relation_name_hi,
        caste_hi=caste_hi, village_hi=village_hi, address_hi=address_hi,
    )
    for k, v in fields.items():
        if v is not None:
            setattr(c, k, v)
    if photo and photo.filename:
        ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
        c.photo_path = save_photo(await photo.read(), ext)
    elif photo_base64:
        if "," in photo_base64:
            photo_base64 = photo_base64.split(",", 1)[1]
        c.photo_path = save_photo(base64.b64decode(photo_base64), "jpg")
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(c)
    db.commit()
