"""Testes de limite por IP das rotas públicas."""


def test_login_bloqueia_sexta_tentativa(client):
    email = "desconhecido@example.com"

    for _ in range(5):
        resposta = client.post(
            "/api/auth/login",
            data={"username": email, "password": "senha-incorreta"},
        )
        assert resposta.status_code == 401

    resposta = client.post(
        "/api/auth/login",
        data={"username": email, "password": "senha-incorreta"},
    )
    assert resposta.status_code == 429


def test_login_limite_por_email_independente_do_ip(client):
    email = "alvo@example.com"

    for i in range(5):
        resposta = client.post(
            "/api/auth/login",
            data={"username": email, "password": "senha-incorreta"},
            headers={"X-Forwarded-For": f"192.0.2.{i + 1}"},
        )
        assert resposta.status_code == 401

    resposta = client.post(
        "/api/auth/login",
        data={"username": email, "password": "senha-incorreta"},
        headers={"X-Forwarded-For": "192.0.2.10"},
    )
    assert resposta.status_code == 429


def test_login_emails_diferentes_nao_compartilham_limite(client):
    for i in range(5):
        resposta = client.post(
            "/api/auth/login",
            data={
                "username": f"usuario{i}@example.com",
                "password": "senha-incorreta",
            },
        )
        assert resposta.status_code == 401

    resposta = client.post(
        "/api/auth/login",
        data={
            "username": "outro@example.com",
            "password": "senha-incorreta",
        },
    )
    assert resposta.status_code == 401


def test_cadastro_bloqueia_quarta_tentativa(client):
    dados = {
        "clinica": {"nome": "Clinica Teste", "cnpj": "98765432100123"},
        "responsavel": {
            "nome": "Administradora Teste",
            "email": "administradora@example.com",
            "senha": "SenhaSegura123!",
            "whatsapp": "75999990000",
            "crefito": "12345-F",
        },
    }
    for _ in range(3):
        resposta = client.post("/api/cadastro", json=dados)
        assert resposta.status_code != 429

    resposta = client.post("/api/cadastro", json=dados)
    assert resposta.status_code == 429


def test_login_correto_nao_consume_limite(client):
    email = "teste-limite@example.com"
    senha = "SenhaTeste123!"

    cadastro = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clinica Teste Limite",
                "cnpj": "55555555000155",
            },
            "responsavel": {
                "nome": "Responsavel Teste",
                "email": email,
                "whatsapp": "5575999999999",
                "senha": senha,
                "crefito": "12345-F",
            },
        },
    )
    assert cadastro.status_code == 201

    # Quatro falhas para o mesmo e-mail.
    for _ in range(4):
        resposta = client.post(
            "/api/auth/login",
            data={"username": email, "password": "senha-incorreta"},
        )
        assert resposta.status_code == 401

    # Login correto não deve consumir o limite.
    resposta = client.post(
        "/api/auth/login",
        data={"username": email, "password": senha},
    )
    assert resposta.status_code == 200
    assert resposta.json()["access_token"]

    # A quinta falha ainda deve retornar 401.
    resposta = client.post(
        "/api/auth/login",
        data={"username": email, "password": "senha-incorreta"},
    )
    assert resposta.status_code == 401

    # A sexta tentativa deve ser bloqueada.
    resposta = client.post(
        "/api/auth/login",
        data={"username": email, "password": senha},
    )
    assert resposta.status_code == 429
