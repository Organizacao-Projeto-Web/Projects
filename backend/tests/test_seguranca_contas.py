def test_primeiro_cadastro_cria_clinica_e_responsavel(client):
    response = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clínica Primeiro Acesso",
                "cnpj": "33333333000133",
            },
            "responsavel": {
                "nome": "Fisioterapeuta Responsável",
                "email": "responsavel@example.com",
                "senha": "SenhaTeste123!",
                "crefito": "12345-F",
            },
        },
    )

    assert response.status_code == 201

    dados = response.json()

    assert dados["clinica"]["nome"] == "Clínica Primeiro Acesso"
    assert dados["responsavel"]["nome"] == "Fisioterapeuta Responsável"
    assert dados["responsavel"]["email"] == "responsavel@example.com"

    # O backend deve definir a associação com a clínica.
    assert dados["responsavel"]["clinica_id"] == dados["clinica"]["id"]

    # Senha e hash nunca devem aparecer na resposta.
    assert "senha" not in dados["responsavel"]
    assert "senha_hash" not in dados["responsavel"]

def test_usuario_inativo_nao_pode_fazer_login(client, app_context):
    _, TestSessionLocal = app_context

    cadastro = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clínica Usuário Inativo",
                "cnpj": "44444444000144",
            },
            "responsavel": {
                "nome": "Fisioterapeuta Inativo",
                "email": "inativo@example.com",
                "senha": "SenhaTeste123!",
                "crefito": "54321-F",
            },
        },
    )

    assert cadastro.status_code == 201

    from app.models.user import UsuarioModel

    db = TestSessionLocal()

    try:
        usuario = (
            db.query(UsuarioModel)
            .filter(UsuarioModel.email == "inativo@example.com")
            .first()
        )

        assert usuario is not None

        usuario.ativo = False
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/auth/login",
        data={
            "username": "inativo@example.com",
            "password": "SenhaTeste123!",
        },
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Usuário inativo."
    }

def test_nao_permite_criar_usuario_sem_autenticacao(client):
    cadastro = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clínica Protegida",
                "cnpj": "55555555000155",
            },
            "responsavel": {
                "nome": "Responsável Clínica Protegida",
                "email": "responsavel.protegida@example.com",
                "senha": "SenhaTeste123!",
                "crefito": "11111-F",
            },
        },
    )

    assert cadastro.status_code == 201

    clinica_id = cadastro.json()["clinica"]["id"]

    response = client.post(
        "/api/usuarios",
        json={
            "nome": "Usuário Indevido",
            "email": "indevido@example.com",
            "senha": "SenhaTeste123!",
            "crefito": "99999-F",
            "cargo": "fisioterapeuta",
            "clinica_id": clinica_id,
        },
    )

    assert response.status_code == 401

def test_usuario_nao_pode_criar_usuario_em_outra_clinica(client):
    cadastro_a = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clínica A",
                "cnpj": "66666666000166",
            },
            "responsavel": {
                "nome": "Responsável A",
                "email": "responsavel.a@example.com",
                "senha": "SenhaTeste123!",
                "crefito": "11111-F",
            },
        },
    )

    cadastro_b = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clínica B",
                "cnpj": "77777777000177",
            },
            "responsavel": {
                "nome": "Responsável B",
                "email": "responsavel.b@example.com",
                "senha": "SenhaTeste123!",
                "crefito": "22222-F",
            },
        },
    )

    assert cadastro_a.status_code == 201
    assert cadastro_b.status_code == 201

    clinica_a_id = cadastro_a.json()["clinica"]["id"]
    clinica_b_id = cadastro_b.json()["clinica"]["id"]

    login = client.post(
        "/api/auth/login",
        data={
            "username": "responsavel.a@example.com",
            "password": "SenhaTeste123!",
        },
    )

    assert login.status_code == 200

    headers_a = {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }

    response = client.post(
        "/api/usuarios",
        headers=headers_a,
        json={
            "nome": "Novo Fisioterapeuta",
            "email": "novo.fisio@example.com",
            "senha": "SenhaTeste123!",
            "crefito": "33333-F",
            "cargo": "fisioterapeuta",

            # Tentativa maliciosa:
            # usuário da Clínica A tenta escolher a Clínica B.
            "clinica_id": clinica_b_id,
        },
    )

    assert response.status_code == 422

def test_usuario_inativo_com_token_existente_nao_pode_acessar_sistema(
    client,
    app_context,
):
    _, TestSessionLocal = app_context

    cadastro = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": "Clínica Token Revogado",
                "cnpj": "66666666000166",
            },
            "responsavel": {
                "nome": "Fisioterapeuta Token Revogado",
                "email": "token.revogado@example.com",
                "senha": "SenhaTeste123!",
                "crefito": "22222-F",
            },
        },
    )

    assert cadastro.status_code == 201

    login = client.post(
        "/api/auth/login",
        data={
            "username": "token.revogado@example.com",
            "password": "SenhaTeste123!",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    # Confirma que o token funciona antes da desativação.
    perfil = client.get(
        "/api/usuarios/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert perfil.status_code == 200

    from app.models.user import UsuarioModel

    db = TestSessionLocal()

    try:
        usuario = (
            db.query(UsuarioModel)
            .filter(
                UsuarioModel.email == "token.revogado@example.com"
            )
            .first()
        )

        assert usuario is not None

        usuario.ativo = False
        db.commit()
    finally:
        db.close()

    # O mesmo token não pode continuar funcionando
    # depois que a conta for desativada.
    response = client.get(
        "/api/usuarios/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401

def test_nao_permite_acesso_direto_a_clinicas(client):
    response_post = client.post(
        "/api/clinicas",
        json={
            "nome": "Clínica Órfã",
            "cnpj": "77777777000177",
        },
    )

    assert response_post.status_code == 404

    response_get = client.get("/api/clinicas")

    assert response_get.status_code == 404
