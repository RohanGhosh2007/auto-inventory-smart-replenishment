from sqlalchemy.orm import Session
from sqlalchemy import func

from .models import Sale


def calculate_forecast(
    db: Session,
    product_id: int
):

    daily_sales = (
        db.query(
            Sale.sale_date,
            func.sum(Sale.quantity).label("total_quantity")
        )
        .filter(
            Sale.product_id == product_id
        )
        .group_by(
            Sale.sale_date
        )
        .order_by(
            Sale.sale_date.desc()
        )
        .limit(7)
        .all()
    )

    if not daily_sales:

        return {
            "product_id": product_id,
            "average_daily_demand": 0,
            "forecast_next_7_days": 0,
            "days_used": 0
        }


    quantities = [
        row.total_quantity
        for row in daily_sales
    ]


    average_daily_demand = (
        sum(quantities) / len(quantities)
    )


    forecast_next_7_days = (
        average_daily_demand * 7
    )


    return {
        "product_id": product_id,

        "average_daily_demand": round(
            average_daily_demand,
            2
        ),

        "forecast_next_7_days": round(
            forecast_next_7_days,
            2
        ),

        "days_used": len(quantities)
    }