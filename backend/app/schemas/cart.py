from pydantic import BaseModel, ConfigDict, Field


class CartProductPreview(BaseModel):
    id: int
    title: str
    price: float
    image_url: str | None = None
    stock: int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class CartItemAdd(BaseModel):
    product_id: int = Field(..., description="ID of the product to add to the cart")
    quantity: int = Field(default=1, gt=0, description="Quantity to add (must be at least 1)")


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., gt=0, description="New quantity for the cart item (must be at least 1)")


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: CartProductPreview
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    id: int
    items: list[CartItemResponse]
    total_price: float
    total_items: int

    model_config = ConfigDict(from_attributes=True)
