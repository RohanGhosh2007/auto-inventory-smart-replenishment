from . import models


def get_stock_status(product):
    if product.current_stock == 0:
        return "OUT OF STOCK"

    if product.current_stock <= product.safety_stock:
        return "LOW STOCK"

    return "NORMAL"


def get_inventory_summary(db):
    products = db.query(models.Product).all()

    total_products = len(products)
    low_stock_items = 0
    out_of_stock_items = 0

    for product in products:
        status = get_stock_status(product)

        if status == "LOW STOCK":
            low_stock_items += 1

        elif status == "OUT OF STOCK":
            out_of_stock_items += 1

    return {
        "total_products": total_products,
        "low_stock_items": low_stock_items,
        "out_of_stock_items": out_of_stock_items
    }