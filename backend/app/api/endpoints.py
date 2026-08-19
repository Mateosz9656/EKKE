from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.services.llm import evaluate_prompt_with_gatekeeper, worker_chat_stream

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or user.password_hash != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"id": user.id, "username": user.username, "role": user.role}

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "assigned_teacher_id": u.assigned_teacher_id} for u in users]

class AssignRequest(BaseModel):
    teacher_id: int

@router.put("/users/{student_id}/assign")
def assign_teacher(student_id: int, req: AssignRequest, db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.id == student_id, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.assigned_teacher_id = req.teacher_id
    db.commit()
    return {"status": "ok"}

@router.post("/tasks", response_model=schemas.TaskResponse)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(title=task.title, tudaster_markdown=task.tudaster_markdown)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/tasks", response_model=list[schemas.TaskResponse])
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(models.Task).all()
    return tasks

@router.get("/tasks/{task_id}", response_model=schemas.TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/chat")
def chat(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    session = None
    if request.session_id:
        session = db.query(models.ChatSession).filter(models.ChatSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        log_count = db.query(models.PromptLog).filter(models.PromptLog.session_id == session.id).count()
        if log_count == 0 and (session.title == "Új beszélgetés" or session.title == "Új chat"):
            session.title = request.prompt[:30] + ("..." if len(request.prompt) > 30 else "")

    evaluation, token_cost = evaluate_prompt_with_gatekeeper(request.prompt, task.tudaster_markdown)

    total_score = evaluation.K + evaluation.O + evaluation.S + evaluation.I + evaluation.C + evaluation.E
    quality = total_score / 12.0

    status = models.PromptStatus.accepted
    if quality < 0.40:
        status = models.PromptStatus.rejected
    elif quality < 0.75:
        status = models.PromptStatus.refine

    prompt_log = models.PromptLog(
        task_id=task.id,
        session_id=request.session_id,
        hallgato_promptja=request.prompt,
        K=evaluation.K,
        K_indoklas=evaluation.K_indoklas,
        O=evaluation.O,
        O_indoklas=evaluation.O_indoklas,
        S=evaluation.S,
        S_indoklas=evaluation.S_indoklas,
        I=evaluation.I,
        I_indoklas=evaluation.I_indoklas,
        C=evaluation.C,
        C_indoklas=evaluation.C_indoklas,
        E=evaluation.E,
        E_indoklas=evaluation.E_indoklas,
        quality_score=quality,
        edukativ_visszajelzes=evaluation.edukativ_visszajelzes,
        token_usage=token_cost,
        status=status
    )
    db.add(prompt_log)
    db.commit()
    db.refresh(prompt_log)

    if status == models.PromptStatus.rejected or status == models.PromptStatus.refine:
        return {
            "type": "evaluation",
            "scores": evaluation.model_dump(),
            "quality": quality,
            "message": evaluation.edukativ_visszajelzes,
            "status": status.value,
            "token_cost": token_cost
        }

    eval_dict = {
        "scores": evaluation.model_dump(),
        "quality": quality,
        "token_cost": token_cost,
        "status": status.value
    }
    return StreamingResponse(worker_chat_stream(request.prompt, task.tudaster_markdown, db, prompt_log.id, eval_dict), media_type="text/event-stream")

@router.get("/sessions/{user_id}", response_model=list[schemas.ChatSessionResponse])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).order_by(models.ChatSession.updated_at.desc()).all()
    return sessions

@router.post("/sessions", response_model=schemas.ChatSessionResponse)
def create_session(session: schemas.ChatSessionCreate, db: Session = Depends(get_db)):
    db_session = models.ChatSession(
        user_id=session.user_id,
        task_id=session.task_id,
        title=session.title
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/sessions/{user_id}/{session_id}", response_model=schemas.ChatSessionDetail)
def get_session_detail(user_id: int, session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == user_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = []
    logs = db.query(models.PromptLog).filter(models.PromptLog.session_id == session_id).order_by(models.PromptLog.created_at.asc()).all()

    for log in logs:

        messages.append(schemas.MessageResponse(
            role="user",
            content=log.hallgato_promptja
        ))

        if log.status in [models.PromptStatus.rejected, models.PromptStatus.refine]:
            messages.append(schemas.MessageResponse(
                role="assistant",
                content=log.edukativ_visszajelzes,
                isEvaluation=True,
                evaluationData=schemas.EvaluationResponse(
                    scores=schemas.KosiceEvaluation(
                        K=log.K, K_indoklas=log.K_indoklas,
                        O=log.O, O_indoklas=log.O_indoklas,
                        S=log.S, S_indoklas=log.S_indoklas, 
                        I=log.I, I_indoklas=log.I_indoklas,
                        C=log.C, C_indoklas=log.C_indoklas,
                        E=log.E, E_indoklas=log.E_indoklas,
                        edukativ_visszajelzes=log.edukativ_visszajelzes
                    ),
                    quality=log.quality_score,
                    message=log.edukativ_visszajelzes,
                    status=log.status,
                    token_cost=log.token_usage
                )
            ))
        else:
            if log.mi_valasz:
                messages.append(schemas.MessageResponse(
                    role="assistant",
                    content=log.mi_valasz
                ))

    return schemas.ChatSessionDetail(
        id=session.id,
        user_id=session.user_id,
        task_id=session.task_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages
    )

@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "ok"}
