def criar_clinica_admin(
    client,
    nome_clinica,
    cnpj,
    nome_admin,
    email_admin,
    crefito,
):
    response = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": nome_clinica,
                "cnpj": cnpj,
            },
            "responsavel": {
                "nome": nome_admin,
                "email": email_admin,
                "senha": "SenhaTeste123!",
                "crefito": crefito,
            },
        },
    )

    assert response.status_code == 201, response.json()

    return response.json()


def login(client, email):
    response = client.post(
        "/api/auth/login",
        data={
            "username": email,
            "password": "SenhaTeste123!",
        },
    )

    assert response.status_code == 200, response.json()

    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def criar_paciente(
    client,
    headers,
    nome,
    cpf,
):
    response = client.post(
        "/api/pacientes",
        headers=headers,
        json={
            "nome": nome,
            "cpf": cpf,
        },
    )

    assert response.status_code == 201, response.json()

    return response.json()


def criar_usuario(
    client,
    headers_admin,
    nome,
    email,
    cargo,
    crefito,
):
    response = client.post(
        "/api/usuarios",
        headers=headers_admin,
        json={
            "nome": nome,
            "email": email,
            "senha": "SenhaTeste123!",
            "cargo": cargo,
            "crefito": crefito,
        },
    )

    assert response.status_code == 201, response.json()

    return response.json()


def preparar_consulta(client):
    criar_clinica_admin(
        client,
        nome_clinica="Clínica Consultas",
        cnpj="55555555000155",
        nome_admin="Administrador Consultas",
        email_admin="admin.consultas@example.com",
        crefito="55555-F",
    )

    headers = login(
        client,
        "admin.consultas@example.com",
    )

    paciente = criar_paciente(
        client,
        headers,
        nome="Paciente Consulta",
        cpf="55555555555",
    )

    return headers, paciente


def test_consulta_salva_dor_e_percepcao(client):
    headers, paciente = preparar_consulta(client)

    response = client.post(
        "/api/consultas",
        headers=headers,
        json={
            "paciente_id": paciente["id"],
            "queixa_principal": "Dor no joelho",
            "diagnostico": "Dor durante flexão",
            "prescricao": "Exercícios de mobilidade",
            "observacoes": "Paciente colaborativo",
            "dor_atual": 7,
            "percepcao_paciente": "melhorou",
        },
    )

    assert response.status_code == 201, response.json()

    consulta = response.json()

    assert consulta["paciente_id"] == paciente["id"]
    assert consulta["dor_atual"] == 7
    assert consulta["percepcao_paciente"] == "melhorou"

    historico = client.get(
        f"/api/consultas/paciente/{paciente['id']}",
        headers=headers,
    )

    assert historico.status_code == 200, historico.json()

    consultas = historico.json()

    assert len(consultas) == 1
    assert consultas[0]["dor_atual"] == 7
    assert consultas[0]["percepcao_paciente"] == "melhorou"


def test_consulta_rejeita_dor_fora_do_intervalo(client):
    headers, paciente = preparar_consulta(client)

    response = client.post(
        "/api/consultas",
        headers=headers,
        json={
            "paciente_id": paciente["id"],
            "queixa_principal": "Dor lombar",
            "dor_atual": 11,
            "percepcao_paciente": "igual",
        },
    )

    assert response.status_code == 422


def test_consulta_rejeita_percepcao_invalida(client):
    headers, paciente = preparar_consulta(client)

    response = client.post(
        "/api/consultas",
        headers=headers,
        json={
            "paciente_id": paciente["id"],
            "queixa_principal": "Dor cervical",
            "dor_atual": 5,
            "percepcao_paciente": "mais_ou_menos",
        },
    )

    assert response.status_code == 422


def test_acompanhamento_clinico_exige_autenticacao(client):
    response = client.get("/api/dashboard/acompanhamento-clinico")

    assert response.status_code == 401


def test_recepcao_nao_pode_acessar_acompanhamento_clinico(client):
    criar_clinica_admin(
        client,
        nome_clinica="Clínica Dashboard Recepção",
        cnpj="61111111000111",
        nome_admin="Administrador Dashboard",
        email_admin="admin.dashboard.recepcao@example.com",
        crefito="61111-F",
    )

    headers_admin = login(
        client,
        "admin.dashboard.recepcao@example.com",
    )

    criar_usuario(
        client,
        headers_admin,
        nome="Recepcionista Dashboard",
        email="recepcao.dashboard@example.com",
        cargo="recepcao",
        crefito="REC-611",
    )

    headers_recepcao = login(
        client,
        "recepcao.dashboard@example.com",
    )

    response = client.get(
        "/api/dashboard/acompanhamento-clinico",
        headers=headers_recepcao,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "A recepção não pode acessar dados clínicos."}


def test_acompanhamento_clinico_isola_dados_por_clinica(client):
    criar_clinica_admin(
        client,
        nome_clinica="Clínica Dashboard A",
        cnpj="62222222000122",
        nome_admin="Administrador Dashboard A",
        email_admin="admin.dashboard.a@example.com",
        crefito="62222-F",
    )

    criar_clinica_admin(
        client,
        nome_clinica="Clínica Dashboard B",
        cnpj="63333333000133",
        nome_admin="Administrador Dashboard B",
        email_admin="admin.dashboard.b@example.com",
        crefito="63333-F",
    )

    headers_a = login(
        client,
        "admin.dashboard.a@example.com",
    )

    headers_b = login(
        client,
        "admin.dashboard.b@example.com",
    )

    paciente_a = criar_paciente(
        client,
        headers_a,
        nome="Paciente Dashboard A",
        cpf="62222222222",
    )

    paciente_b = criar_paciente(
        client,
        headers_b,
        nome="Paciente Dashboard B",
        cpf="63333333333",
    )

    consulta_a = client.post(
        "/api/consultas",
        headers=headers_a,
        json={
            "paciente_id": paciente_a["id"],
            "queixa_principal": "Dor no joelho",
            "dor_atual": 4,
            "percepcao_paciente": "melhorou",
        },
    )

    assert consulta_a.status_code == 201, consulta_a.json()

    consulta_b = client.post(
        "/api/consultas",
        headers=headers_b,
        json={
            "paciente_id": paciente_b["id"],
            "queixa_principal": "Dor lombar",
            "dor_atual": 9,
            "percepcao_paciente": "piorou",
        },
    )

    assert consulta_b.status_code == 201, consulta_b.json()

    response = client.get(
        "/api/dashboard/acompanhamento-clinico",
        headers=headers_a,
    )

    assert response.status_code == 200, response.json()

    acompanhamento = response.json()

    ids_visiveis = {item["paciente_id"] for item in acompanhamento}

    assert paciente_a["id"] in ids_visiveis
    assert paciente_b["id"] not in ids_visiveis

    nomes_visiveis = {item["paciente_nome"] for item in acompanhamento}

    assert "Paciente Dashboard A" in nomes_visiveis
    assert "Paciente Dashboard B" not in nomes_visiveis
