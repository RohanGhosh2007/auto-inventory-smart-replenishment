from pydantic import BaseModel, ConfigDict
from datetime import date

class ProductCreate(BaseModel): #ProductCreate describes the data required when creating a product.
    name: str
    category: str
    current_stock: int = 0
    unit_price: float = 0.0
    lead_time: int = 0
    safety_stock: int = 0


class ProductResponse(ProductCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


#Add Sales schemas
class SaleCreate(BaseModel):
    product_id: int
    quantity: int
    sale_date: date


class SaleResponse(SaleCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


#Add Purchase Order schemas
class PurchaseOrderCreate(BaseModel):
    product_id: int
    quantity: int
    status: str = "Pending"
    order_date: date


class PurchaseOrderResponse(PurchaseOrderCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)