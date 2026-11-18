from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Display name of the category")
    slug: str | None = Field(default=None, max_length=120, description="URL-friendly slug (auto-generated if omitted)")


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
