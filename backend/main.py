from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from .replenishment import calculate_replenishment
from .database import engine, Base, get_db
from . import models, schemas, inventory, forecasting

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Auto Inventory",
    description="Smart Inventory Forecasting and Automated Replenishment Platform",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)

@app.get("/")
def serve_frontend():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Auto Inventory API is running"
    }


@app.post("/products", response_model=schemas.ProductResponse)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db)
):
    new_product = models.Product(
        name=product.name,
        category=product.category,
        current_stock=product.current_stock,
        unit_price=product.unit_price,
        lead_time=product.lead_time,
        safety_stock=product.safety_stock
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product


@app.get("/products", response_model=list[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()

    return products


@app.get("/products/{product_id}", response_model=schemas.ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


#What the POST /sales endpoint does
#First: Check that the product exists
#Second: Check available stock
#Third: Reduce inventory
@app.post("/sales", response_model=schemas.SaleResponse)
def create_sale(
    sale: schemas.SaleCreate,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.id == sale.product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if sale.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Sale quantity must be greater than zero"
        )

    if sale.quantity > product.current_stock:
        raise HTTPException(
            status_code=400,
            detail="Insufficient stock"
        )

    new_sale = models.Sale(
        product_id=sale.product_id,
        quantity=sale.quantity,
        sale_date=sale.sale_date
    )

    product.current_stock -= sale.quantity

    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)

    return new_sale


@app.get("/sales", response_model=list[schemas.SaleResponse])
def get_sales(db: Session = Depends(get_db)):
    sales = db.query(models.Sale).all()

    return sales


@app.get("/sales/{sale_id}", response_model=schemas.SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db)
):
    sale = db.query(models.Sale).filter(
        models.Sale.id == sale_id
    ).first()

    if sale is None:
        raise HTTPException(
            status_code=404,
            detail="Sale not found"
        )

    return sale

#Add inventory api endpoint
@app.get("/inventory/summary")
def inventory_summary(
    db: Session = Depends(get_db)
):
    return inventory.get_inventory_summary(db)

#Forecast Api endpoint
@app.get("/forecast/{product_id}")
def get_forecast(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return forecasting.calculate_forecast(
        db,
        product_id
    )


#Purchase Order Endpoint
@app.post(
    "/purchase-orders",
    response_model=schemas.PurchaseOrderResponse
)
def create_purchase_order(
    order: schemas.PurchaseOrderCreate,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.id == order.product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if order.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Order quantity must be greater than zero"
        )

    new_order = models.PurchaseOrder(
        product_id=order.product_id,
        quantity=order.quantity,
        status=order.status,
        order_date=order.order_date
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order


@app.get(
    "/purchase-orders",
    response_model=list[schemas.PurchaseOrderResponse]
)
def get_purchase_orders(
    db: Session = Depends(get_db)
):
    orders = db.query(models.PurchaseOrder).all()

    return orders


@app.get(
    "/purchase-orders/{order_id}",
    response_model=schemas.PurchaseOrderResponse
)
def get_purchase_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.id == order_id
    ).first()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    return order


#Mark a purchase order as received and add the quantity back into stock
@app.patch(
    "/purchase-orders/{order_id}/receive",
    response_model=schemas.PurchaseOrderResponse
)
def receive_purchase_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.id == order_id
    ).first()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    if order.status == "Received":
        raise HTTPException(
            status_code=400,
            detail="Purchase order already received"
        )

    product = db.query(models.Product).filter(
        models.Product.id == order.product_id
    ).first()

    if product is not None:
        product.current_stock += order.quantity

    order.status = "Received"

    db.commit()
    db.refresh(order)

    return order


@app.get("/replenishment/{product_id}")
def get_replenishment(
    product_id: int,
    db: Session = Depends(get_db)
):

    result = calculate_replenishment(
        db,
        product_id
    )

    if "error" in result:
        raise HTTPException(
            status_code=404,
            detail=result["error"]
        )

    return result