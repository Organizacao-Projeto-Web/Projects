from typing import List
import jwt
from jose import JWTError  # Importado para capturar a exceÃ§Ã£o do token JWT

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone

# ImportaÃ§Ã£o Ãºnica e correta do banco de dados
from app.core.database import Base, engine, get_db
from app.core.security import (
    ALGORITHM,
    SECRET_KEY,
    criar_token_acesso,
    gerar_codigo_recuperacao,
    gerar_hash_codigo_recuperacao,
    gerar_hash_senha,
    verificar_senha,
)

# Modelos para criaÃ§Ã£o das tabelas no Banco de Dados
from app.models.clinic import ClinicaModel
from app.models.consultation import ConsultaModel
from app.models.patient import PacienteModel
from app.models.user import UsuarioModel
from app.models.password_reset_code import PasswordResetCodeModel

# Schemas
from app.schemas.consultation import ConsultaCreate, ConsultaResponse
from app.schemas.patient import PacienteCreate, PacienteResponse
from app.schemas.password_reset import (
    MensagemRecuperacaoResponse,
    SolicitarRecuperacaoSenhaRequest,
)
from app.schemas.user import (
    PrimeiroCadastro,
    PrimeiroCadastroResponse,
    Token,
    TokenData,
    UsuarioCreate,
    UsuarioResponse,
)

# Criar tabelas na inicializaÃ§Ã£o
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ProntuÃ¡rio EletrÃ´nico API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def obter_usuario_atual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="NÃ£o foi possÃ­vel validar as credenciais",
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

    if usuario is None or not usuario.ativo:
        raise credentials_exception

    return usuario


@app.get("/")
def home():
    return {"mensagem": "API de ProntuÃ¡rio EletrÃ´nico rodando com sucesso!"}


# ==================== AUTENTICAÃ‡ÃƒO E USUÃRIOS ====================


@app.post(
    "/api/cadastro",
    response_model=PrimeiroCadastroResponse,
    status_code=status.HTTP_201_CREATED,
)
def primeiro_cadastro(
    cadastro: PrimeiroCadastro,
    db: Session = Depends(get_db),
):
    if (
        db.query(UsuarioModel)
        .filter(UsuarioModel.email == cadastro.responsavel.email)
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail="E-mail jÃ¡ cadastrado no sistema.",
        )

    if (
        db.query(ClinicaModel)
        .filter(ClinicaModel.cnpj == cadastro.clinica.cnpj)
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail="CNPJ jÃ¡ cadastrado no sistema.",
        )

    try:
        nova_clinica = ClinicaModel(
            nome=cadastro.clinica.nome,
            cnpj=cadastro.clinica.cnpj,
        )
        db.add(nova_clinica)

        # ObtÃ©m o ID da clÃ­nica sem confirmar a transaÃ§Ã£o.
        db.flush()

        novo_responsavel = UsuarioModel(
            nome=cadastro.responsavel.nome,
            email=cadastro.responsavel.email,
            whatsapp=cadastro.responsavel.whatsapp,
            senha_hash=gerar_hash_senha(cadastro.responsavel.senha),
            crefito=cadastro.responsavel.crefito,
            cargo="admin",
            clinica_id=nova_clinica.id,
        )

        db.add(novo_responsavel)

        db.commit()

        db.refresh(nova_clinica)
        db.refresh(novo_responsavel)

        return {
            "clinica": nova_clinica,
            "responsavel": novo_responsavel,
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="NÃ£o foi possÃ­vel concluir o cadastro.",
        )


@app.post(
    "/api/usuarios",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_usuario(
    usuario: UsuarioCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    if usuario_atual.cargo != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem criar usuÃ¡rios.",
        )

    if usuario.cargo == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="NÃ£o Ã© permitido criar outro administrador.",
        )

    if db.query(UsuarioModel).filter(UsuarioModel.email == usuario.email).first():
        raise HTTPException(
            status_code=400,
            detail="E-mail jÃ¡ cadastrado no sistema.",
        )

    novo_usuario = UsuarioModel(
        nome=usuario.nome,
        email=usuario.email,
        whatsapp=usuario.whatsapp,
        senha_hash=gerar_hash_senha(usuario.senha),
        crefito=usuario.crefito,
        cargo=usuario.cargo,
        clinica_id=usuario_atual.clinica_id,
    )

    try:
        db.add(novo_usuario)
        db.commit()
        db.refresh(novo_usuario)
        return novo_usuario
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="NÃ£o foi possÃ­vel criar o usuÃ¡rio.",
        )


@app.post("/api/auth/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    usuario = (
        db.query(UsuarioModel).filter(UsuarioModel.email == form_data.username).first()
    )

    if not usuario or not verificar_senha(
        form_data.password,
        usuario.senha_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
        )

    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UsuÃ¡rio inativo.",
        )

    access_token = criar_token_acesso(data={"sub": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.post(
    "/api/auth/recuperacao-senha/solicitar",
    response_model=MensagemRecuperacaoResponse,
)
def solicitar_recuperacao_senha(
    dados: SolicitarRecuperacaoSenhaRequest,
    db: Session = Depends(get_db),
):
    mensagem = {
        "mensagem": (
            "Se os dados informados estiverem cadastrados, "
            "um cÃ³digo serÃ¡ enviado pelo WhatsApp."
        )
    }

    usuario = (
        db.query(UsuarioModel).filter(UsuarioModel.email == str(dados.email)).first()
    )

    if not usuario or not usuario.ativo or not usuario.whatsapp:
        return mensagem

    agora = datetime.now(timezone.utc).replace(tzinfo=None)

    # Invalida cÃ³digos anteriores ainda nÃ£o utilizados.
    db.query(PasswordResetCodeModel).filter(
        PasswordResetCodeModel.usuario_id == usuario.id,
        PasswordResetCodeModel.used_at.is_(None),
    ).update(
        {"used_at": agora},
        synchronize_session=False,
    )

    codigo = gerar_codigo_recuperacao()

    novo_codigo = PasswordResetCodeModel(
        usuario_id=usuario.id,
        codigo_hash=gerar_hash_codigo_recuperacao(codigo),
        expires_at=agora + timedelta(minutes=10),
        tentativas=0,
    )

    db.add(novo_codigo)
    db.commit()

    return mensagem


@app.get("/api/usuarios/me", response_model=UsuarioResponse)
def obter_meu_perfil(usuario_atual: UsuarioModel = Depends(obter_usuario_atual)):
    return usuario_atual


# ==================================== PACIENTES ====================


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
    try:
        novo_paciente = PacienteModel(
            nome=paciente.nome,
            cpf=paciente.cpf,
            data_nascimento=paciente.data_nascimento,
            telefone=paciente.telefone,
            clinica_id=usuario_atual.clinica_id,
        )
        db.add(novo_paciente)
        db.commit()
        db.refresh(novo_paciente)
        return novo_paciente
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="JÃ¡ existe um paciente cadastrado com este CPF.",
        )


@app.get("/api/pacientes", response_model=List[PacienteResponse])
def listar_pacientes(
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    return (
        db.query(PacienteModel)
        .filter(PacienteModel.clinica_id == usuario_atual.clinica_id)
        .all()
    )


# ==================== CONSULTAS E PRONTUÃRIO ====================


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
    if usuario_atual.cargo == "recepcao":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A recepÃ§Ã£o nÃ£o pode registrar consultas.",
        )

    paciente = (
        db.query(PacienteModel)
        .filter(
            PacienteModel.id == consulta.paciente_id,
            PacienteModel.clinica_id == usuario_atual.clinica_id,
        )
        .first()
    )

    if not paciente:
        raise HTTPException(
            status_code=404,
            detail="Paciente nÃ£o encontrado.",
        )

    nova_consulta = ConsultaModel(
        paciente_id=paciente.id,
        medico_id=usuario_atual.id,
        queixa_principal=consulta.queixa_principal,
        diagnostico=consulta.diagnostico,
        prescricao=consulta.prescricao,
        observacoes=consulta.observacoes,
    )

    try:
        db.add(nova_consulta)
        db.commit()
        db.refresh(nova_consulta)
        return nova_consulta
    except IntegrityError:
        db.rollback()
    raise HTTPException(
        status_code=400,
        detail="NÃ£o foi possÃ­vel registrar a consulta.",
    )

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
    if usuario_atual.cargo == "recepcao":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A recepÃ§Ã£o nÃ£o pode acessar prontuÃ¡rios.",
        )

    paciente = (
        db.query(PacienteModel)
        .filter(
            PacienteModel.id == paciente_id,
            PacienteModel.clinica_id == usuario_atual.clinica_id,
        )
        .first()
    )

    if not paciente:
        raise HTTPException(
            status_code=404,
            detail="Paciente nÃ£o encontrado.",
        )

    return (
        db.query(ConsultaModel)
        .filter(ConsultaModel.paciente_id == paciente.id)
        .order_by(ConsultaModel.created_at.desc())
        .all()
    )
