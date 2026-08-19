from app.db.database import engine, Base, SessionLocal
from app.models.models import User, UserRole, Task

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    admin = db.query(User).filter(User.username == "admin@uni-eszterhazy.hu").first()
    if not admin:
        admin = User(
            username="admin@uni-eszterhazy.hu",
            password_hash="admin123",  
            role=UserRole.admin
        )
        db.add(admin)

    teacher = db.query(User).filter(User.username == "oktato@uni-eszterhazy.hu").first()
    if not teacher:
        teacher = User(
            username="oktato@uni-eszterhazy.hu",
            password_hash="password123",
            role=UserRole.teacher
        )
        db.add(teacher)
        db.commit() 
        db.refresh(teacher)

    student = db.query(User).filter(User.username == "NEPTUN123").first()
    if not student:
        student = User(
            username="NEPTUN123",
            password_hash="password123",
            role=UserRole.student,
            assigned_teacher_id=teacher.id
        )
        db.add(student)

    db.commit()

    task = db.query(Task).filter(Task.id == 4).first()
    if not task:
        task = Task(
            id=4,
            title="Python Web Scraping",
            tudaster_markdown="# Python Web Scraping Tudástér\nAlapvető információk..."
        )
        db.add(task)
        db.commit()

    db.close()
    print("Database seeded with default users and tasks.")

if __name__ == "__main__":
    seed_db()
