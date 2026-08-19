from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.models import PromptStatus

class TaskBase(BaseModel):
    title: str
    tudaster_markdown: str

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: int

    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    title: str = "Új beszélgetés"

class ChatSessionCreate(ChatSessionBase):
    user_id: int
    task_id: int

class ChatSessionResponse(ChatSessionBase):
    id: int
    user_id: int
    task_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class KosiceEvaluation(BaseModel):
    K: int = Field(description="Tudástérhez illeszkedés (0, 1, vagy 2)")
    K_indoklas: str = Field(description="Indoklás a K dimenzióhoz")
    O: int = Field(description="Cél egyértelműsége (0, 1, vagy 2)")
    O_indoklas: str = Field(description="Indoklás az O dimenzióhoz")
    S: int = Field(description="Részfeladat kijelölése (0, 1, vagy 2)")
    S_indoklas: str = Field(description="Indoklás az S dimenzióhoz")
    I: int = Field(description="Bemenetek megadása (0, 1, vagy 2)")
    I_indoklas: str = Field(description="Indoklás az I dimenzióhoz")
    C: int = Field(description="Ellenőrizhetőség (0, 1, vagy 2)")
    C_indoklas: str = Field(description="Indoklás a C dimenzióhoz")
    E: int = Field(description="Elvárt kimenet megadása (0, 1, vagy 2)")
    E_indoklas: str = Field(description="Indoklás az E dimenzióhoz")
    edukativ_visszajelzes: str = Field(description="Szöveges edukatív visszajelzés a hallgatónak, amely segíti a prompt javítását.")

class EvaluationResponse(BaseModel):
    type: str = "evaluation"
    scores: KosiceEvaluation
    quality: float
    message: str
    status: PromptStatus
    token_cost: Optional[int] = None

class MessageResponse(BaseModel):
    role: str
    content: str
    isEvaluation: Optional[bool] = False
    evaluationData: Optional[EvaluationResponse] = None
    token_cost: Optional[int] = None

class ChatSessionDetail(ChatSessionResponse):
    messages: List[MessageResponse]

class ChatRequest(BaseModel):
    prompt: str
    task_id: int
    session_id: Optional[int] = None

