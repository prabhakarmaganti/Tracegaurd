from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend import crud, database, schemas

router = APIRouter(prefix="/api", tags=["master_data"])


# --- Machines ---
@router.get("/machines")
def get_machines(db: Session = Depends(database.get_db)):
    return crud.get_machines(db)

@router.post("/machines")
def create_machine(req: schemas.MachineCreate, db: Session = Depends(database.get_db)):
    return crud.create_machine(db, req)


# --- Operators ---
@router.get("/operators")
def get_operators(db: Session = Depends(database.get_db)):
    return crud.get_operators(db)

@router.post("/operators")
def create_operator(req: schemas.OperatorCreate, db: Session = Depends(database.get_db)):
    return crud.create_operator(db, req)


# --- Shifts ---
@router.get("/shifts")
def get_shifts(db: Session = Depends(database.get_db)):
    return crud.get_shifts(db)

@router.post("/shifts")
def create_shift(req: schemas.ShiftCreate, db: Session = Depends(database.get_db)):
    return crud.create_shift(db, req)


# --- Products ---
@router.get("/products")
def get_products(db: Session = Depends(database.get_db)):
    return crud.get_products(db)

@router.post("/products")
def create_product(req: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    return crud.create_product(db, req)


# --- Suppliers ---
@router.get("/suppliers")
def get_suppliers(db: Session = Depends(database.get_db)):
    return crud.get_suppliers(db)

@router.post("/suppliers")
def create_supplier(req: schemas.SupplierCreate, db: Session = Depends(database.get_db)):
    return crud.create_supplier(db, req)
