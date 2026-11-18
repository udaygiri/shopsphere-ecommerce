from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.cart import CartProductPreview


class WishlistItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    created_at: datetime
    product: CartProductPreview

    model_config = ConfigDict(from_attributes=True)
