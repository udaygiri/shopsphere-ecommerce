from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryResponse


class SellerPreview(BaseModel):
    id: int
    email: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Product title")
    description: str | None = Field(default=None, max_length=5000, description="Detailed product description")
    price: float = Field(..., gt=0, description="Price must be greater than 0")
    stock: int = Field(default=0, ge=0, description="Available inventory quantity")
    image_url: str | None = Field(default=None, max_length=500, description="Cloudinary secure image URL")
    category_id: int = Field(..., description="ID of the category this product belongs to")
    is_active: bool = Field(default=True, description="Whether product is active and visible in catalog")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=500)
    category_id: int | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    title: str
    description: str | None
    price: float
    stock: int
    image_url: str | None
    category_id: int
    seller_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: CategoryResponse | None = None
    seller: SellerPreview | None = None

    model_config = ConfigDict(from_attributes=True)
