import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
from app.services.llm import evaluate_prompt_with_gatekeeper

try:
    print(evaluate_prompt_with_gatekeeper("teszt prompt", "teszt tudaster"))
except Exception as e:
    import traceback
    traceback.print_exc()
