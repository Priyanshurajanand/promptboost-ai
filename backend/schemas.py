from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str

class PromptRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "default"
