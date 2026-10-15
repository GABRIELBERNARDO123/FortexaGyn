import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TransactionCreate(BaseModel):
    kind: Literal["income", "expense"]
    category: Literal[
        "mensalidade", "venda", "entrada_avulsa", "estoque", "despesa", "saida_avulsa"
    ]
    amount: float = Field(ge=0, le=10_000_000, allow_inf_nan=False)
    description: str = Field("", max_length=500)
    occurred_on: date
    student_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def kind_matches_category(self):
        income_categories = {"mensalidade", "venda", "entrada_avulsa"}
        if (self.kind == "income") != (self.category in income_categories):
            raise ValueError("Categoria incompatível com o tipo da transação")
        return self


class TransactionUpdate(BaseModel):
    description: str | None = Field(None, max_length=500)
    amount: float | None = Field(default=None, ge=0, le=10_000_000, allow_inf_nan=False)
    occurred_on: date | None = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    category: str
    amount: float
    description: str
    occurred_on: date
    student_id: uuid.UUID | None
    product_id: uuid.UUID | None
