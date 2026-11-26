from typing import List
import jwt
import os
from dotenv import load_dotenv

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from limits import parse
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter

# Importação única e correta do banco de dados
from app.core.database import Base, engine, get_db
from app.core.dependencies import obter_usuario_atual, oauth2_scheme
from app.routers.avaliacoes import router as avaliacoes_router
from app.core.email import EmailEnvioError, enviar_codigo_recuperacao
from app.core.security import (
    ALGORITHM,
    SECRET_KEY,
    criar_token_acesso,
    gerar_codigo_recuperacao,
    gerar_hash_codigo_recuperacao,
    gerar_hash_senha,
    verificar_codigo_recuperacao,
    verificar_senha,
)

# Modelos para criação das tabelas no Banco de Dados
from app.models.clinic import ClinicaModel
from app.models.patient import PacienteModel
from app.models.user import UsuarioModel
from app.models.appointment import AgendamentoModel
from app.models.consultation import ConsultaModel

from app.schemas.password_reset import (
    MensagemRecuperacaoResponse,
    SolicitarRecuperacaoSenhaRequest,
    TokenRedefinicaoSenhaResponse,
    VerificarCodigoRecuperacaoRequest,
    RedefinirSenhaRequest,
)
from app.models.user import UsuarioModel
from app.models.password_reset_code import PasswordResetCodeModel

# Schemas
from app.schemas.consultation import (
    AcompanhamentoClinicoResponse,
    ConsultaCreate,
    ConsultaResponse,
)
from app.schemas.patient import PacienteCreate, PacienteResponse, PacienteUpdate
from app.schemas.user import (
    PrimeiroCadastro,
    PrimeiroCadastroResponse,
    Token,
    TokenData,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioResponse,
)
from app.schemas.appointment import (
    AgendamentoCreate,
    AgendamentoResponse,
    AgendamentoStatusUpdate,
)

app = FastAPI(title="Prontuário Eletrônico API", version="1.0.0")
app.include_router(avaliacoes_router)

# Proteção contra excesso de requisições
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Controle de tentativas de login por e-mail
login_storage = MemoryStorage()
login_strategy = MovingWindowRateLimiter(login_storage)
LIMITE_LOGIN_CONTA = parse("5/15minute")

# Origens permitidas para o frontend
load_dotenv()

CORS_ORIGINS = [
    origem.strip()
    for origem in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origem.strip()
]

# Permissão de comunicação com o frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"mensagem": "API de Prontuário Eletrônico rodando com sucesso!"}


# ==================== AUTENTICAÃ‡ÃƒO E USUÃRIOS ====================


@app.post(
    "/api/cadastro",
    response_model=PrimeiroCadastroResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/minute")
def primeiro_cadastro(
    request: Request,
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
            detail="Não foi possível criar o usuário.",
        )


@app.get("/api/usuarios/equipe", response_model=List[UsuarioResponse])
def listar_equipe_admin(
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    if usuario_atual.cargo != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso exclusivo do administrador."
        )
    return (
        db.query(UsuarioModel)
        .filter(UsuarioModel.clinica_id == usuario_atual.clinica_id)
        .order_by(UsuarioModel.nome.asc())
        .all()
    )


@app.patch("/api/usuarios/{usuario_id}", response_model=UsuarioResponse)
def editar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    if usuario_atual.cargo != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso exclusivo do administrador."
        )

    usuario = (
        db.query(UsuarioModel)
        .filter(
            UsuarioModel.id == usuario_id,
            UsuarioModel.clinica_id == usuario_atual.clinica_id,
        )
        .first()
    )
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    alteracoes = dados.model_dump(exclude_unset=True)
    if not alteracoes:
        raise HTTPException(status_code=422, detail="Informe pelo menos um campo.")
    if any(
        valor is None
        for campo, valor in alteracoes.items()
        if campo in ("nome", "email", "cargo", "ativo")
    ):
        raise HTTPException(
            status_code=422, detail="Campo obrigatório não pode ser nulo."
        )

    # Nunca modificar o cargo de um admin, nem desativar a própria conta.
    if usuario.cargo == "admin" and ("cargo" in alteracoes or "ativo" in alteracoes):
        raise HTTPException(
            status_code=403,
            detail="Não é permitido alterar cargo ou situação de administrador.",
        )
    if usuario.id == usuario_atual.id and alteracoes.get("ativo") is False:
        raise HTTPException(
            status_code=403, detail="Não é permitido desativar a própria conta."
        )

    if "email" in alteracoes:
        alteracoes["email"] = str(alteracoes["email"])
        outro = (
            db.query(UsuarioModel)
            .filter(
                UsuarioModel.email == alteracoes["email"], UsuarioModel.id != usuario_id
            )
            .first()
        )
        if outro is not None:
            raise HTTPException(
                status_code=409, detail="E-mail já cadastrado no sistema."
            )

    for campo, valor in alteracoes.items():
        setattr(usuario, campo, valor)
    try:
        db.commit()
        db.refresh(usuario)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Não foi possível atualizar o usuário."
        )
    return usuario


@app.post("/api/auth/login", response_model=Token)
@limiter.limit("20/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username.strip().lower()

    # Verifica se o e-mail atingiu o limite de falhas.
    if not login_strategy.test(LIMITE_LOGIN_CONTA, "login", email):
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas de login. Tente novamente em alguns minutos.",
        )

    usuario = db.query(UsuarioModel).filter(UsuarioModel.email == email).first()

    if not usuario or not verificar_senha(
        form_data.password,
        usuario.senha_hash,
    ):
        # Somente tentativas inválidas são contabilizadas.
        login_strategy.hit(LIMITE_LOGIN_CONTA, "login", email)

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


@app.post(
    "/api/auth/recuperacao-senha/solicitar",
    response_model=MensagemRecuperacaoResponse,
)
@limiter.limit("5/minute")
def solicitar_recuperacao_senha(
    request: Request,
    dados: SolicitarRecuperacaoSenhaRequest,
    db: Session = Depends(get_db),
):
    mensagem = {
        "mensagem": (
            "Se os dados informados estiverem cadastrados, "
            "um código será enviado por e-mail."
        )
    }

    usuario = (
        db.query(UsuarioModel).filter(UsuarioModel.email == str(dados.email)).first()
    )

    if not usuario or not usuario.ativo:
        return mensagem

    agora = datetime.now(timezone.utc).replace(tzinfo=None)

    ultima_solicitacao = (
        db.query(PasswordResetCodeModel)
        .filter(PasswordResetCodeModel.usuario_id == usuario.id)
        .order_by(PasswordResetCodeModel.created_at.desc())
        .first()
    )

    if ultima_solicitacao and ultima_solicitacao.created_at > agora - timedelta(
        seconds=60
    ):
        return mensagem

    # Invalida códigos anteriores ainda não utilizados.
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

    try:
        db.add(novo_codigo)
        db.flush()

        # Envia o código pelo Gmail.
        enviar_codigo_recuperacao(usuario.email, codigo)

        db.commit()

    except EmailEnvioError:
        db.rollback()

    except Exception:
        db.rollback()
        raise

    return mensagem


@app.post(
    "/api/auth/recuperacao-senha/verificar",
    response_model=TokenRedefinicaoSenhaResponse,
)
def verificar_codigo_recuperacao_senha(
    dados: VerificarCodigoRecuperacaoRequest,
    db: Session = Depends(get_db),
):
    usuario = (
        db.query(UsuarioModel).filter(UsuarioModel.email == str(dados.email)).first()
    )

    mensagem_erro = "Código inválido ou expirado."

    if not usuario or not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    codigo_registro = (
        db.query(PasswordResetCodeModel)
        .filter(
            PasswordResetCodeModel.usuario_id == usuario.id,
            PasswordResetCodeModel.used_at.is_(None),
        )
        .order_by(PasswordResetCodeModel.id.desc())
        .first()
    )

    if not codigo_registro:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    agora = datetime.now(timezone.utc).replace(tzinfo=None)

    if codigo_registro.expires_at <= agora:
        codigo_registro.used_at = agora
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    if codigo_registro.tentativas >= 5:
        codigo_registro.used_at = agora
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    if not verificar_codigo_recuperacao(
        dados.codigo,
        codigo_registro.codigo_hash,
    ):
        codigo_registro.tentativas += 1

        if codigo_registro.tentativas >= 5:
            codigo_registro.used_at = agora

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    codigo_registro.used_at = agora
    db.commit()

    reset_token = criar_token_acesso(
        data={
            "sub": "password_reset",
            "uid": usuario.id,
            "rid": codigo_registro.id,
            "purpose": "password_reset",
        },
        expires_delta=timedelta(minutes=10),
    )

    return {
        "reset_token": reset_token,
    }


@app.post(
    "/api/auth/recuperacao-senha/redefinir",
    response_model=MensagemRecuperacaoResponse,
)
def redefinir_senha(
    dados: RedefinirSenhaRequest,
    db: Session = Depends(get_db),
):
    mensagem_erro = "Token de redefinição inválido ou expirado."

    try:
        payload = jwt.decode(
            dados.reset_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    if (
        payload.get("sub") != "password_reset"
        or payload.get("purpose") != "password_reset"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    usuario_id = payload.get("uid")
    recuperacao_id = payload.get("rid")

    if not usuario_id or not recuperacao_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    usuario = (
        db.query(UsuarioModel)
        .filter(
            UsuarioModel.id == usuario_id,
            UsuarioModel.ativo.is_(True),
        )
        .first()
    )

    recuperacao = (
        db.query(PasswordResetCodeModel)
        .filter(
            PasswordResetCodeModel.id == recuperacao_id,
            PasswordResetCodeModel.usuario_id == usuario_id,
        )
        .first()
    )

    if not usuario or not recuperacao or recuperacao.used_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensagem_erro,
        )

    usuario.senha_hash = gerar_hash_senha(dados.nova_senha)

    # Remove o registro utilizado.
    # Assim, o mesmo reset_token não poderá ser reutilizado.
    db.delete(recuperacao)

    db.commit()

    return {"mensagem": "Senha redefinida com sucesso."}


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
    except IntegrityError as exc:
        db.rollback()

        if getattr(exc.orig, "args", (None,))[
            0
        ] == 1062 and "uq_pacientes_clinica_cpf" in str(exc.orig):
            raise HTTPException(
                status_code=400,
                detail="Já existe paciente com este CPF nesta clínica.",
            )

        raise HTTPException(
            status_code=400,
            detail="Não foi possível cadastrar a paciente. Confira os dados informados.",
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


@app.get(
    "/api/pacientes/{paciente_id}",
    response_model=PacienteResponse,
)
def obter_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
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

    return paciente


@app.patch(
    "/api/pacientes/{paciente_id}",
    response_model=PacienteResponse,
)
def atualizar_paciente(
    paciente_id: int,
    dados: PacienteUpdate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
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

    alteracoes = dados.model_dump(exclude_unset=True)

    if "nome" in alteracoes and alteracoes["nome"] is None:
        raise HTTPException(
            status_code=422,
            detail="O nome da paciente não pode ser nulo.",
        )

    for campo, valor in alteracoes.items():
        setattr(paciente, campo, valor)

    try:
        db.commit()
        db.refresh(paciente)

    except IntegrityError as exc:
        db.rollback()

        if getattr(exc.orig, "args", (None,))[
            0
        ] == 1062 and "uq_pacientes_clinica_cpf" in str(exc.orig):
            raise HTTPException(
                status_code=409,
                detail="Já existe paciente com este CPF nesta clínica.",
            )

        raise HTTPException(
            status_code=409,
            detail="Não foi possível atualizar a paciente. Confira os dados informados.",
        )

    return paciente


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
        dor_atual=consulta.dor_atual,
        percepcao_paciente=consulta.percepcao_paciente,
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
    "/api/dashboard/acompanhamento-clinico",
    response_model=List[AcompanhamentoClinicoResponse],
)
def obter_acompanhamento_clinico(
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
):
    if usuario_atual.cargo == "recepcao":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A recepção não pode acessar dados clínicos.",
        )

    registros = (
        db.query(ConsultaModel, PacienteModel)
        .join(
            PacienteModel,
            ConsultaModel.paciente_id == PacienteModel.id,
        )
        .filter(PacienteModel.clinica_id == usuario_atual.clinica_id)
        .order_by(
            ConsultaModel.paciente_id.asc(),
            ConsultaModel.created_at.desc(),
        )
        .all()
    )

    consultas_por_paciente = {}

    for consulta, paciente in registros:
        if paciente.id not in consultas_por_paciente:
            consultas_por_paciente[paciente.id] = {
                "paciente": paciente,
                "consultas": [],
            }

        consultas_por_paciente[paciente.id]["consultas"].append(consulta)

    resultado = []

    for item in consultas_por_paciente.values():
        paciente = item["paciente"]
        consultas = item["consultas"]

        consulta_atual = consultas[0]

        consulta_anterior = consultas[1] if len(consultas) > 1 else None

        sessoes_sem_melhora = 0

        for consulta in consultas:
            if consulta.percepcao_paciente in (
                "igual",
                "piorou",
            ):
                sessoes_sem_melhora += 1

            elif consulta.percepcao_paciente == "melhorou":
                break

            else:
                break

        resultado.append(
            {
                "paciente_id": paciente.id,
                "paciente_nome": paciente.nome,
                "dor_atual": consulta_atual.dor_atual,
                "dor_anterior": (
                    consulta_anterior.dor_atual if consulta_anterior else None
                ),
                "percepcao_paciente": (consulta_atual.percepcao_paciente),
                "sessoes_sem_melhora": sessoes_sem_melhora,
                "ultima_sessao": consulta_atual.created_at,
            }
        )

    resultado.sort(
        key=lambda item: item["ultima_sessao"],
        reverse=True,
    )

    return resultado[:5]


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
    # Não aceitar datas com fuso horário no payload
    if (
        inicio_novo.tzinfo is not None
        and inicio_novo.tzinfo.utcoffset(inicio_novo) is not None
    ):
        raise HTTPException(
            status_code=422,
            detail="Informe data e hora local, sem fuso horário.",
        )

    # Horário local da Bahia (UTC-3)
    agora = datetime.now(timezone(timedelta(hours=-3))).replace(tzinfo=None)

    if inicio_novo < agora:
        raise HTTPException(
            status_code=422,
            detail="Não é permitido criar agendamentos em datas ou horários passados.",
        )

    fim_novo = inicio_novo + timedelta(minutes=agendamento.duracao_minutos)

    # Serializa as reservas do mesmo profissional no MySQL (InnoDB).
    # O lock permanece até commit/rollback e impede que duas requisições
    # simultâneas validem o mesmo horário antes de gravar.
    db.query(UsuarioModel.id).filter(
        UsuarioModel.id == profissional.id,
        UsuarioModel.clinica_id == usuario_atual.clinica_id,
    ).with_for_update().one()

    agendamentos_existentes = (
        db.query(AgendamentoModel)
        .filter(
            AgendamentoModel.profissional_id == profissional.id,
            AgendamentoModel.clinica_id == usuario_atual.clinica_id,
            AgendamentoModel.status != "cancelado",
        )
        # Leitura atual (locking read): não utiliza um snapshot antigo da
        # transação REPEATABLE READ iniciado ao consultar paciente/usuário.
        .with_for_update()
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

    if dados.status == agendamento.status:
        return agendamento

    if agendamento.status != "agendado":
        raise HTTPException(
            status_code=409,
            detail="Este agendamento já foi finalizado ou cancelado.",
        )

    if dados.status == "agendado":
        raise HTTPException(
            status_code=409,
            detail="Não é permitido reabrir um agendamento.",
        )

    if dados.status == "realizado" and usuario_atual.cargo == "recepcao":
        raise HTTPException(
            status_code=403,
            detail="A recepção não pode concluir atendimentos.",
        )

    agendamento.status = dados.status

    db.commit()
    db.refresh(agendamento)

    return agendamento
