import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Carrega as variáveis de ambiente do ficheiro .env
load_dotenv()

# URL de conexão com o MySQL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+pymysql://root:suasenha@localhost:3306/reab_db"
)

# Trata argumentos específicos de conexão (o SQLite precisa de check_same_thread, o MySQL não)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Criação do engine de conexão com o SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True  # Garante reconexão automática se a conexão MySQL cair por inatividade
)

SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

# Classe base para a criação dos modelos ORM
Base = declarative_base()

# Dependency para injeção de sessão do banco nas rotas do FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()