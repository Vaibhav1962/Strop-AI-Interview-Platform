from typing import Literal

from pydantic import BaseModel, Field

Language = Literal["Python", "JavaScript", "Java", "C++"]


class ExecuteRequest(BaseModel):
    language: Language
    source_code: str = Field(min_length=1, max_length=20000)
    stdin: str = Field(default="", max_length=10000)


class ExecuteResponse(BaseModel):
    stdout: str | None
    stderr: str | None
    compile_output: str | None
    message: str | None
    status: str | None
    time: str | None
    memory: int | None
