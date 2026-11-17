from pydantic import BaseModel
from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: str | None = None
    role: UserRole | None = None
