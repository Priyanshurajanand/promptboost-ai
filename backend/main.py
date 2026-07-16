from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User
from schemas import UserCreate, PromptRequest
from auth import hash_password, verify_password, create_token
from groq import Groq
import os, traceback
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

_key = os.getenv("GROQ_API_KEY", "")
print(f"[PromptBoost] GROQ_API_KEY loaded: {'YES → ' + _key[:12] + '...' if _key else 'NOT FOUND ❌'}")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PromptBoost AI API", version="3.0.0")

groq_client = Groq(api_key=_key)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Mode-specific system prompts ─────────────────────────────

MODE_PROMPTS = {
    "default": (
        "You are a prompt optimization engine. "
        "Your ONLY job is to rewrite the user's input into a better, clearer, more detailed prompt. "
        "STRICT RULES:\n"
        "- DO NOT answer, respond to, or execute the prompt.\n"
        "- DO NOT explain what you changed.\n"
        "- DO NOT add bullet points, headers, or alternatives.\n"
        "- DO NOT include any commentary before or after.\n"
        "- Output ONLY the rewritten prompt text, nothing else."
    ),
    "creative": (
        "You are a creative prompt optimizer. "
        "Rewrite the given prompt to be more vivid, imaginative, and expressive. "
        "Use rich descriptive language and evocative phrasing to inspire creative output. "
        "STRICT RULES: Output ONLY the rewritten prompt. No explanations, no commentary."
    ),
    "technical": (
        "You are a technical prompt optimizer. "
        "Rewrite the given prompt to be precise, structured, and technically rigorous. "
        "Use specific terminology, define expected output format, add relevant constraints and edge cases. "
        "STRICT RULES: Output ONLY the rewritten prompt. No explanations, no commentary."
    ),
    "concise": (
        "You are a conciseness-focused prompt optimizer. "
        "Rewrite the given prompt to be as short and punchy as possible while preserving full meaning. "
        "Remove all redundancy — every word must earn its place. Aim for maximum signal, minimum noise. "
        "STRICT RULES: Output ONLY the rewritten prompt. No explanations, no commentary."
    ),
    "detailed": (
        "You are a detail-oriented prompt optimizer. "
        "Rewrite the given prompt to be comprehensive and thorough. "
        "Add relevant context, specify desired tone, format, length, audience, and important constraints. "
        "Make it impossible to misunderstand what is being asked. "
        "STRICT RULES: Output ONLY the rewritten prompt. No explanations, no commentary."
    ),
    "eli5": (
        "You are a simplification-focused prompt optimizer. "
        "Rewrite the given prompt using extremely simple language that a 5-year-old could understand. "
        "Use short sentences, everyday words, and avoid all jargon and technical terms. "
        "STRICT RULES: Output ONLY the rewritten prompt. No explanations, no commentary."
    ),
}

# ─── DB Dependency ────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── Routes ───────────────────────────────────────────────────

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "PromptBoost AI",
        "version": "3.0.0",
        "llm": "Groq llama-3.1-8b-instant",
        "modes": list(MODE_PROMPTS.keys()),
    }

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = User(email=user.email, password=hash_password(user.password))
    db.add(db_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_token({"sub": user.email})
    return {"access_token": token}

@app.post("/optimize")
def optimize(data: PromptRequest):
    mode = data.mode if data.mode in MODE_PROMPTS else "default"
    system_prompt = MODE_PROMPTS[mode]

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Rewrite and optimize this prompt:\n\n{data.prompt}"},
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=1024,
        )
        optimized = chat_completion.choices[0].message.content.strip()
        return {"optimized_prompt": optimized, "mode": mode}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")