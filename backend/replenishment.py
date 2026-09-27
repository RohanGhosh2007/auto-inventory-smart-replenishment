from sqlalchemy.orm import Session

from .models import Product
from .forecasting import calculate_forecast


def calculate_replenishment(
    db: Session,
    product_id: int
):

    # Get product
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        return {
            "error": "Product not found"
        }

    # Get forecast
    forecast = calculate_forecast(
        db,
        product_id
    )

    average_daily_demand = (
        forecast["average_daily_demand"]
    )

    # Calculate reorder point
    reorder_point = (
        average_daily_demand
        * product.lead_time
    ) + product.safety_stock

    # Determine whether replenishment is required
    reorder_required = (
        product.current_stock
        <= reorder_point
    )

    # Suggested order quantity
    suggested_order_quantity = max(
        0,
        round(
            reorder_point
            - product.current_stock
        )
    )

    return {
        "product_id": product.id,
        "product_name": product.name,

        "current_stock": product.current_stock,

        "average_daily_demand": round(
            average_daily_demand,
            2
        ),

        "forecast_next_7_days": forecast[
            "forecast_next_7_days"
        ],

        "lead_time": product.lead_time,

        "safety_stock": product.safety_stock,

        "reorder_point": round(
            reorder_point,
            2
        ),

        "reorder_required": reorder_required,

        "suggested_order_quantity":
            suggested_order_quantity
    }