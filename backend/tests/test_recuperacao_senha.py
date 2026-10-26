import pytest
from datetime import datetime, timedelta, timezone

from app.models.password_reset_code import PasswordResetCodeModel
from app.models.user import UsuarioModel
from app.core.security import gerar_hash_codigo_recuperacao

MENSAGEM_GENERICA = {
    "mensagem": (
        "Se os dados informados estiverem cadastrados, "
        "um código será enviado pelo WhatsApp."
    )
}


@pytest.fixture(autouse=True)
def simular_envio_whatsapp(monkeypatch):
    def envio_mock(numero: str, codigo: str):
        return {
            "messages": [
                {
                    "id": "mensagem-teste",
                }
            ]
        }

    monkeypatch.setattr(
        "app.main.enviar_codigo_recuperacao",
        envio_mock,
    )


def criar_conta(client):
    response = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clínica Recuperação",
                "cnpj": "12345678000195",
            },
            "responsavel": {
                "nome": "Administrador Recuperação",
                "email": "recuperacao@example.com",
                "whatsapp": "5575999999999",
                "senha": "SenhaTeste123!",
                "crefito": "12345-F",
            },
        },
    )

    assert response.status_code == 201, response.json()

    return response.json()


def test_solicitar_recuperacao_cria_codigo(client, app_context):
    _, TestSessionLocal = app_context

    criar_conta(client)

    response = client.post(
        "/api/auth/recuperacao-senha/solicitar",
        json={
            "email": "recuperacao@example.com",
        },
    )

    assert response.status_code == 200
    assert response.json() == MENSAGEM_GENERICA

    db = TestSessionLocal()

    try:
        usuario = (
            db.query(UsuarioModel)
            .filter(UsuarioModel.email == "recuperacao@example.com")
            .first()
        )

        codigo = (
            db.query(PasswordResetCodeModel)
            .filter(PasswordResetCodeModel.usuario_id == usuario.id)
            .first()
        )

        assert codigo is not None
        assert codigo.codigo_hash
        assert codigo.tentativas == 0
        assert codigo.used_at is None

        agora = datetime.now(timezone.utc).replace(tzinfo=None)

        assert codigo.expires_at > agora
        assert codigo.expires_at <= agora + timedelta(minutes=11)

    finally:
        db.close()


def test_solicitar_recuperacao_nao_revela_email_inexistente(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    response = client.post(
        "/api/auth/recuperacao-senha/solicitar",
        json={
            "email": "naoexiste@example.com",
        },
    )

    assert response.status_code == 200
    assert response.json() == MENSAGEM_GENERICA

    db = TestSessionLocal()

    try:
        quantidade = db.query(PasswordResetCodeModel).count()

        assert quantidade == 0

    finally:
        db.close()


def test_nova_solicitacao_invalida_codigo_anterior(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    criar_conta(client)

    primeira = client.post(
        "/api/auth/recuperacao-senha/solicitar",
        json={
            "email": "recuperacao@example.com",
        },
    )

    assert primeira.status_code == 200

    segunda = client.post(
        "/api/auth/recuperacao-senha/solicitar",
        json={
            "email": "recuperacao@example.com",
        },
    )

    assert segunda.status_code == 200

    db = TestSessionLocal()

    try:
        usuario = (
            db.query(UsuarioModel)
            .filter(UsuarioModel.email == "recuperacao@example.com")
            .first()
        )

        codigos = (
            db.query(PasswordResetCodeModel)
            .filter(PasswordResetCodeModel.usuario_id == usuario.id)
            .order_by(PasswordResetCodeModel.id.asc())
            .all()
        )

        assert len(codigos) == 2

        assert codigos[0].used_at is not None
        assert codigos[1].used_at is None

    finally:
        db.close()


def criar_codigo_teste(
    TestSessionLocal,
    email,
    codigo="123456",
):
    db = TestSessionLocal()

    try:
        usuario = db.query(UsuarioModel).filter(UsuarioModel.email == email).first()

        registro = PasswordResetCodeModel(
            usuario_id=usuario.id,
            codigo_hash=gerar_hash_codigo_recuperacao(codigo),
            expires_at=(
                datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)
            ),
            tentativas=0,
        )

        db.add(registro)
        db.commit()
        db.refresh(registro)

        return registro.id

    finally:
        db.close()


def test_verificar_codigo_correto_gera_reset_token(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    criar_conta(client)

    codigo_id = criar_codigo_teste(
        TestSessionLocal,
        "recuperacao@example.com",
    )

    response = client.post(
        "/api/auth/recuperacao-senha/verificar",
        json={
            "email": "recuperacao@example.com",
            "codigo": "123456",
        },
    )

    assert response.status_code == 200
    assert response.json()["reset_token"]

    db = TestSessionLocal()

    try:
        registro = db.get(
            PasswordResetCodeModel,
            codigo_id,
        )

        assert registro.used_at is not None

    finally:
        db.close()


def test_codigo_incorreto_aumenta_tentativas(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    criar_conta(client)

    codigo_id = criar_codigo_teste(
        TestSessionLocal,
        "recuperacao@example.com",
    )

    response = client.post(
        "/api/auth/recuperacao-senha/verificar",
        json={
            "email": "recuperacao@example.com",
            "codigo": "999999",
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Código inválido ou expirado."}

    db = TestSessionLocal()

    try:
        registro = db.get(
            PasswordResetCodeModel,
            codigo_id,
        )

        assert registro.tentativas == 1
        assert registro.used_at is None

    finally:
        db.close()


def test_codigo_e_invalidado_apos_cinco_tentativas(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    criar_conta(client)

    codigo_id = criar_codigo_teste(
        TestSessionLocal,
        "recuperacao@example.com",
    )

    for _ in range(5):
        response = client.post(
            "/api/auth/recuperacao-senha/verificar",
            json={
                "email": "recuperacao@example.com",
                "codigo": "999999",
            },
        )

        assert response.status_code == 400

    db = TestSessionLocal()

    try:
        registro = db.get(
            PasswordResetCodeModel,
            codigo_id,
        )

        assert registro.tentativas == 5
        assert registro.used_at is not None

    finally:
        db.close()


def obter_reset_token(client, TestSessionLocal):
    criar_conta(client)

    criar_codigo_teste(
        TestSessionLocal,
        "recuperacao@example.com",
        codigo="123456",
    )

    response = client.post(
        "/api/auth/recuperacao-senha/verificar",
        json={
            "email": "recuperacao@example.com",
            "codigo": "123456",
        },
    )

    assert response.status_code == 200

    return response.json()["reset_token"]


def test_redefinir_senha_com_token_valido(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    reset_token = obter_reset_token(
        client,
        TestSessionLocal,
    )

    response = client.post(
        "/api/auth/recuperacao-senha/redefinir",
        json={
            "reset_token": reset_token,
            "nova_senha": "NovaSenha123!",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"mensagem": "Senha redefinida com sucesso."}

    login_antigo = client.post(
        "/api/auth/login",
        data={
            "username": "recuperacao@example.com",
            "password": "SenhaTeste123!",
        },
    )

    assert login_antigo.status_code == 401

    login_novo = client.post(
        "/api/auth/login",
        data={
            "username": "recuperacao@example.com",
            "password": "NovaSenha123!",
        },
    )

    assert login_novo.status_code == 200
    assert login_novo.json()["access_token"]


def test_reset_token_nao_pode_ser_reutilizado(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    reset_token = obter_reset_token(
        client,
        TestSessionLocal,
    )

    primeira = client.post(
        "/api/auth/recuperacao-senha/redefinir",
        json={
            "reset_token": reset_token,
            "nova_senha": "NovaSenha123!",
        },
    )

    assert primeira.status_code == 200

    segunda = client.post(
        "/api/auth/recuperacao-senha/redefinir",
        json={
            "reset_token": reset_token,
            "nova_senha": "OutraSenha123!",
        },
    )

    assert segunda.status_code == 400
    assert segunda.json() == {"detail": "Token de redefinição inválido ou expirado."}


def test_redefinir_senha_rejeita_token_invalido(client):
    response = client.post(
        "/api/auth/recuperacao-senha/redefinir",
        json={
            "reset_token": "token-invalido-que-nao-e-jwt",
            "nova_senha": "NovaSenha123!",
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Token de redefinição inválido ou expirado."}
