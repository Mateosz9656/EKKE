from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"

class PromptStatus(str, enum.Enum):
    rejected = "rejected"
    refine = "refine"
    accepted = "accepted"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(Enum(UserRole), default=UserRole.student)

    assigned_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    students = relationship("User", back_populates="teacher", remote_side=[id])
    teacher = relationship("User", back_populates="students", remote_side=[assigned_teacher_id])
    chat_sessions = relationship("ChatSession", back_populates="user")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    tudaster_markdown = Column(Text)

    logs = relationship("PromptLog", back_populates="task")
    chat_sessions = relationship("ChatSession", back_populates="task")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"))
    title = Column(String, default="Új beszélgetés")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chat_sessions")
    task = relationship("Task", back_populates="chat_sessions")
    logs = relationship("PromptLog", back_populates="session", cascade="all, delete-orphan")

class PromptLog(Base):
    __tablename__ = "prompt_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    hallgato_promptja = Column(Text)
    K = Column(Integer)
    K_indoklas = Column(Text, nullable=True)
    O = Column(Integer)
    O_indoklas = Column(Text, nullable=True)
    S = Column(Integer)
    S_indoklas = Column(Text, nullable=True)
    I = Column(Integer)
    I_indoklas = Column(Text, nullable=True)
    C = Column(Integer)
    C_indoklas = Column(Text, nullable=True)
    E = Column(Integer)
    E_indoklas = Column(Text, nullable=True)
    quality_score = Column(Float)
    edukativ_visszajelzes = Column(Text, nullable=True)
    token_usage = Column(Integer, nullable=True)
    status = Column(Enum(PromptStatus))
    mi_valasz = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="logs")
    session = relationship("ChatSession", back_populates="logs")
