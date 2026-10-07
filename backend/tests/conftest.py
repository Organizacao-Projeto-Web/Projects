import os
import sys
import pytest
from pathlib import Path

from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_DIR / ".env")

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


TEST_DATABASE_NAME = "projeto_extensionistadb_test"

os.environ["DB_NAME"] = TEST_DATABASE_NAME

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))


@pytest.fixture(scope="session")
def test_engine():
    if not DB_USER or DB_PASS is None:
        pytest.exit(
            "Credenciais MySQL de teste não encontradas no ambiente.",
            returncode=1,
        )

    test_url = URL.create(
        drivername="mysql+pymysql",
        username=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT,
        database=TEST_DATABASE_NAME,
    )

    engine = create_engine(test_url, pool_pre_ping=True)

    # Trava 1: os testes devem usar MySQL.
    if engine.dialect.name != "mysql":
        pytest.exit(
            "SEGURANÇA: os testes devem utilizar MySQL.",
            returncode=1,
        )

    # Trava 2: nunca permitir limpeza no banco de desenvolvimento.
    if engine.url.database != TEST_DATABASE_NAME:
        pytest.exit(
            "SEGURANÇA: tentativa de executar testes fora do banco de teste.",
            returncode=1,
        )

    yield engine

    engine.dispose()


@pytest.fixture(scope="session")
def app_context(test_engine):
    from app.core.database import Base, get_db

    # Registra todos os modelos no metadata do SQLAlchemy.
    from app.models.appointment import AgendamentoModel  # noqa: F401
    from app.models.clinic import ClinicaModel  # noqa: F401
    from app.models.consultation import ConsultaModel  # noqa: F401
    from app.models.patient import PacienteModel  # noqa: F401
    from app.models.user import UsuarioModel  # noqa: F401

    from app.main import app

    TestSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )

    # ATENÇÃO:
    # Estas operações atingem exclusivamente projeto_extensionistadb_test,
    # garantido pelas travas acima.
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    yield app, TestSessionLocal

    app.dependency_overrides.clear()

    # Limpa exclusivamente o banco de testes ao final da sessão.
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def limpar_banco_entre_testes(app_context, test_engine):
    from app.core.database import Base

    # ATENÇÃO:
    # Limpeza executada exclusivamente em projeto_extensionistadb_test,
    # protegido pelas travas do fixture test_engine.
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    yield


@pytest.fixture()
def client(app_context):
    app, _ = app_context

    with TestClient(app) as test_client:
        yield test_client
