from typing import List
import jwt
from jose import JWTError  # Importado para capturar a exceção do token JWT

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Importação única e correta do banco de dados
from app.core.database import Base, engine, get_db
from app.core.security import (
    ALGORITHM,
    SECRET_KEY,
    criar_token_acesso,
    gerar_hash_senha,
    verificar_senha,
)

# Modelos para criação das tabelas no Banco de Dados
from app.models.clinic import ClinicaModel
from app.models.consultation import ConsultaModel
from app.models.patient import PacienteModel
from app.models.user import UsuarioModel

# Schemas
from app.schemas.clinic import ClinicaCreate, ClinicaResponse
from app.schemas.consultation import ConsultaCreate, ConsultaResponse
from app.schemas.patient import PacienteCreate, PacienteResponse
from app.schemas.user import Token, TokenData, UsuarioCreate, UsuarioResponse

# Criar tabelas na inicialização
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Prontuário Eletrônico API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def obter_usuario_atual(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (JWTError, jwt.PyJWTError):
        raise credentials_exception

    usuario = db.query(UsuarioModel).filter(UsuarioModel.email == email).first()
    if usuario is None:
        raise credentials_exception
    return usuario


@app.get("/")
def home():
    return {"mensagem": "API de Prontuário Eletrônico rodando com sucesso!"}


# ==================== AUTENTICAÇÃO E USUÁRIOS ====================


@app.post(
    "/api/usuarios",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    if (
        db.query(UsuarioModel)
        .filter(UsuarioModel.email == usuario.email)
        .first()
    ):
        raise HTTPException(
            status_code=400, detail="E-mail já cadastrado no sistema."
        )

    if (
        not db.query(ClinicaModel)
        .filter(ClinicaModel.id == usuario.clinica_id)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Clínica informada não existe.")

    novo_usuario = UsuarioModel(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=gerar_hash_senha(usuario.senha),
        crefito=usuario.crefito,
        cargo=usuario.cargo,
        clinica_id=usuario.clinica_id,
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


@app.post("/api/auth/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    usuario = (
        db.query(UsuarioModel)
        .filter(UsuarioModel.email == form_data.username)
        .first()
    )
    if not usuario or not verificar_senha(form_data.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
        )

    access_token = criar_token_acesso(data={"sub": usuario.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/usuarios/me", response_model=UsuarioResponse)
def obter_meu_perfil(usuario_atual: UsuarioModel = Depends(obter_usuario_atual)):
    return usuario_atual


# ==================== CLÍNICAS ====================


@app.post(
    "/api/clinicas",
    response_model=ClinicaResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_clinica(clinica: ClinicaCreate, db: Session = Depends(get_db)):
    nova_clinica = ClinicaModel(nome=clinica.nome, cnpj=clinica.cnpj)
    db.add(nova_clinica)
    db.commit()
    db.refresh(nova_clinica)
    return nova_clinica


@app.get("/api/clinicas", response_model=List[ClinicaResponse])
def listar_clinicas(db: Session = Depends(get_db)):
    return db.query(ClinicaModel).all()


# ==================== PACIENTES ====================


@app.post(
    "/api/pacientes",
    response_model=PacienteResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_paciente(
    paciente: PacienteCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),  
):
    if (
        not db.query(ClinicaModel)
        .filter(ClinicaModel.id == paciente.clinica_id)
        .first()
    ):
        raise HTTPException(
            status_code=400, detail="A clínica informada não existe."
        )

    try:
        novo_paciente = PacienteModel(
            nome=paciente.nome,
            cpf=paciente.cpf,
            data_nascimento=paciente.data_nascimento,
            telefone=paciente.telefone,
            clinica_id=paciente.clinica_id,
        )
        db.add(novo_paciente)
        db.commit()
        db.refresh(novo_paciente)
        return novo_paciente
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="Já existe um paciente cadastrado com este CPF."
        )


@app.get("/api/pacientes", response_model=List[PacienteResponse])
def listar_pacientes(
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    return db.query(PacienteModel).all()


# ==================== CONSULTAS E PRONTUÁRIO ====================


@app.post(
    "/api/consultas",
    response_model=ConsultaResponse,
    status_code=status.HTTP_201_CREATED,
)
def registrar_consulta(
    consulta: ConsultaCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    paciente = (
        db.query(PacienteModel)
        .filter(PacienteModel.id == consulta.paciente_id)
        .first()
    )
    if not paciente:
        raise HTTPException(
            status_code=404, detail="Paciente não encontrado."
        )

    nova_consulta = ConsultaModel(
        paciente_id=consulta.paciente_id,
        medico_id=usuario_atual.id,
        queixa_principal=consulta.queixa_principal,
        diagnostico=consulta.diagnostico,
        prescricao=consulta.prescricao,
        observacoes=consulta.observacoes,
    )
    db.add(nova_consulta)
    db.commit()
    db.refresh(nova_consulta)
    return nova_consulta


@app.get(
    "/api/consultas/paciente/{paciente_id}",
    response_model=List[ConsultaResponse],
)
def obter_prontuario_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    return (
        db.query(ConsultaModel)
        .filter(ConsultaModel.paciente_id == paciente_id)
        .order_by(ConsultaModel.created_at.desc())
        .all()
    )