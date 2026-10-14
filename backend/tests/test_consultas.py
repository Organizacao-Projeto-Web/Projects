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
