import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WorkoutExerciseIn(BaseModel):
    position: int = Field(0, ge=0, le=100)
    name: str = Field(..., min_length=1, max_length=120)
    sets: int | None = Field(None, ge=1, le=50)
    reps: str | None = Field(None, max_length=40)
    load: str | None = Field(None, max_length=40)
    rest_seconds: int | None = Field(None, ge=0, le=3600)
    notes: str = Field("", max_length=500)


class WorkoutExerciseOut(WorkoutExerciseIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class WorkoutCreate(BaseModel):
    student_id: uuid.UUID
    coach_id: uuid.UUID | None = None
    name: str = Field(..., min_length=2, max_length=120)
    notes: str = Field("", max_length=2000)
    valid_from: date
    valid_until: date | None = None
    exercises: list[WorkoutExerciseIn] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def valid_period(self):
        if self.valid_until is not None and self.valid_until < self.valid_from:
            raise ValueError("valid_until não pode anteceder valid_from")
        return self


class WorkoutUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    notes: str | None = Field(None, max_length=2000)
    valid_from: date | None = None
    valid_until: date | None = None
    coach_id: uuid.UUID | None = None


class WorkoutOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    coach_id: uuid.UUID | None
    name: str
    notes: str
    valid_from: date
    valid_until: date | None
    exercises: list[WorkoutExerciseOut]
