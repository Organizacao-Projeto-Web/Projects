from typing import List
import jwt
from jose import JWTError  # Importado para capturar a exceção do token JWT

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import timedelta

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
from app.models.appointment import AgendamentoModel
from app.models.clinic import ClinicaModel
from app.models.consultation import ConsultaModel
from app.models.patient import PacienteModel
from app.models.user import UsuarioModel

# Schemas
from app.schemas.consultation import ConsultaCreate, ConsultaResponse
from app.schemas.patient import PacienteCreate, PacienteResponse
from app.schemas.user import (
    PrimeiroCadastro,
    PrimeiroCadastroResponse,
    Token,
    TokenData,
    UsuarioCreate,
    UsuarioResponse,
)
from app.schemas.appointment import (
    AgendamentoCreate,
    AgendamentoResponse,
    AgendamentoStatusUpdate,
)

# Criar tabelas na inicialização
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Prontuário Eletrônico API", version="1.0.0")

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

    if usuario is None or not usuario.ativo:
        raise credentials_exception

    return usuario


@app.get("/")
def home():
    return {"mensagem": "API de Prontuário Eletrônico rodando com sucesso!"}


# ==================== AUTENTICAÇÃO E USUÁRIOS ====================


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
            detail="E-mail já cadastrado no sistema.",
        )

    if (
        db.query(ClinicaModel)
        .filter(ClinicaModel.cnpj == cadastro.clinica.cnpj)
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail="CNPJ já cadastrado no sistema.",
        )

    try:
        nova_clinica = ClinicaModel(
            nome=cadastro.clinica.nome,
            cnpj=cadastro.clinica.cnpj,
        )
        db.add(nova_clinica)

        # Obtém o ID da clínica sem confirmar a transação.
        db.flush()

        novo_responsavel = UsuarioModel(
            nome=cadastro.responsavel.nome,
            email=cadastro.responsavel.email,
            senha_hash=gerar_hash_senha(cadastro.responsavel.senha),
            crefito=cadastro.responsavel.crefito,
            cargo="admin",
            clinica_id=nova_clinica.id,
        )

        db.add(novo_responsavel)

        # Clínica e responsável são gravados juntos.
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
            detail="Não foi possível concluir o cadastro.",
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
            detail="Apenas administradores podem criar usuários.",
        )

    if usuario.cargo == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não é permitido criar outro administrador.",
        )

    if db.query(UsuarioModel).filter(UsuarioModel.email == usuario.email).first():
        raise HTTPException(
            status_code=400,
            detail="E-mail já cadastrado no sistema.",
        )

    novo_usuario = UsuarioModel(
        nome=usuario.nome,
        email=usuario.email,
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
            detail="Não foi possível criar o usuário.",
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
            detail="Usuário inativo.",
        )

    access_token = criar_token_acesso(data={"sub": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.get("/api/usuarios/me", response_model=UsuarioResponse)
def obter_meu_perfil(usuario_atual: UsuarioModel = Depends(obter_usuario_atual)):
    return usuario_atual


# ==================== CLÍNICAS ====================


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
            detail="Já existe um paciente cadastrado com este CPF.",
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
    if usuario_atual.cargo == "recepcao":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A recepção não pode registrar consultas.",
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
            detail="Paciente não encontrado.",
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
        detail="Não foi possível registrar a consulta.",
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
            detail="A recepção não pode acessar prontuários.",
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
            detail="Paciente não encontrado.",
        )

    return (
        db.query(ConsultaModel)
        .filter(ConsultaModel.paciente_id == paciente.id)
        .order_by(ConsultaModel.created_at.desc())
        .all()
    )


@app.get(
    "/api/usuarios/profissionais",
    response_model=List[UsuarioResponse],
)
def listar_profissionais(
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    query = db.query(UsuarioModel).filter(
        UsuarioModel.clinica_id == usuario_atual.clinica_id,
        UsuarioModel.ativo.is_(True),
        UsuarioModel.cargo.in_(["fisioterapeuta", "admin"]),
    )

    if usuario_atual.cargo == "fisioterapeuta":
        query = query.filter(UsuarioModel.id == usuario_atual.id)

    return query.order_by(UsuarioModel.nome.asc()).all()


# ==================== AGENDAMENTOS ====================


@app.post(
    "/api/agendamentos",
    response_model=AgendamentoResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_agendamento(
    agendamento: AgendamentoCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    paciente = (
        db.query(PacienteModel)
        .filter(
            PacienteModel.id == agendamento.paciente_id,
            PacienteModel.clinica_id == usuario_atual.clinica_id,
        )
        .first()
    )

    if not paciente:
        raise HTTPException(
            status_code=404,
            detail="Paciente não encontrado.",
        )

    profissional = (
        db.query(UsuarioModel)
        .filter(
            UsuarioModel.id == agendamento.profissional_id,
            UsuarioModel.clinica_id == usuario_atual.clinica_id,
            UsuarioModel.ativo.is_(True),
        )
        .first()
    )

    if not profissional:
        raise HTTPException(
            status_code=404,
            detail="Profissional não encontrado.",
        )

    if profissional.cargo not in ("fisioterapeuta", "admin"):
        raise HTTPException(
            status_code=400,
            detail="O usuário selecionado não pode receber agendamentos clínicos.",
        )

    if usuario_atual.cargo == "fisioterapeuta" and profissional.id != usuario_atual.id:
        raise HTTPException(
            status_code=403,
            detail="O fisioterapeuta só pode criar agendamentos para si mesmo.",
        )

    inicio_novo = agendamento.data_hora
    fim_novo = inicio_novo + timedelta(minutes=agendamento.duracao_minutos)

    agendamentos_existentes = (
        db.query(AgendamentoModel)
        .filter(
            AgendamentoModel.profissional_id == profissional.id,
            AgendamentoModel.clinica_id == usuario_atual.clinica_id,
            AgendamentoModel.status != "cancelado",
        )
        .all()
    )

    for existente in agendamentos_existentes:
        inicio_existente = existente.data_hora
        fim_existente = inicio_existente + timedelta(minutes=existente.duracao_minutos)

        if inicio_novo < fim_existente and fim_novo > inicio_existente:
            raise HTTPException(
                status_code=409,
                detail="Já existe um agendamento para este profissional nesse horário.",
            )

    novo_agendamento = AgendamentoModel(
        paciente_id=paciente.id,
        profissional_id=profissional.id,
        clinica_id=usuario_atual.clinica_id,
        data_hora=agendamento.data_hora,
        duracao_minutos=agendamento.duracao_minutos,
        status="agendado",
        observacoes=agendamento.observacoes,
    )

    try:
        db.add(novo_agendamento)
        db.commit()
        db.refresh(novo_agendamento)
        return novo_agendamento
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Não foi possível criar o agendamento.",
        )


@app.get(
    "/api/agendamentos",
    response_model=List[AgendamentoResponse],
)
def listar_agendamentos(
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    query = db.query(AgendamentoModel).filter(
        AgendamentoModel.clinica_id == usuario_atual.clinica_id
    )

    if usuario_atual.cargo == "fisioterapeuta":
        query = query.filter(AgendamentoModel.profissional_id == usuario_atual.id)

    return query.order_by(AgendamentoModel.data_hora.asc()).all()


@app.patch(
    "/api/agendamentos/{agendamento_id}/status",
    response_model=AgendamentoResponse,
)
def atualizar_status_agendamento(
    agendamento_id: int,
    dados: AgendamentoStatusUpdate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    query = db.query(AgendamentoModel).filter(
        AgendamentoModel.id == agendamento_id,
        AgendamentoModel.clinica_id == usuario_atual.clinica_id,
    )

    if usuario_atual.cargo == "fisioterapeuta":
        query = query.filter(AgendamentoModel.profissional_id == usuario_atual.id)

    agendamento = query.first()

    if not agendamento:
        raise HTTPException(
            status_code=404,
            detail="Agendamento não encontrado.",
        )

    agendamento.status = dados.status

    db.commit()
    db.refresh(agendamento)

    return agendamento
