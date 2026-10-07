def criar_clinica_com_responsavel(
    client,
    nome_clinica,
    cnpj,
    nome_responsavel,
    email,
    senha,
):
    response = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": nome_clinica,
                "cnpj": cnpj,
            },
            "responsavel": {
                "nome": nome_responsavel,
                "email": email,
                "senha": senha,
                "crefito": "12345-F",
            },
        },
    )

    assert response.status_code == 201, response.json()

    return response.json()

def autenticar(client, email, senha):
    response = client.post(
        "/api/auth/login",
        data={
            "username": email,
            "password": senha,
        },
    )
    assert response.status_code == 200

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
    }


def criar_paciente(client, headers, nome, cpf):
    response = client.post(
        "/api/pacientes",
        headers=headers,
        json={
            "nome": nome,
            "cpf": cpf,
            "data_nascimento": "1990-01-01",
            "telefone": "11999999999",
        },
    )
    assert response.status_code == 201
    return response.json()


def preparar_cenario(client):
    cadastro_a = criar_clinica_com_responsavel(
        client,
        "Clínica Teste A",
        "11111111000111",
        "Fisioterapeuta A",
        "fisio.a@example.com",
        "SenhaTeste123!",
    )

    cadastro_b = criar_clinica_com_responsavel(
        client,
        "Clínica Teste B",
        "22222222000122",
        "Fisioterapeuta B",
        "fisio.b@example.com",
        "SenhaTeste123!",
    )

    clinica_a = cadastro_a["clinica"]
    clinica_b = cadastro_b["clinica"]

    headers_a = autenticar(
        client,
        "fisio.a@example.com",
        "SenhaTeste123!",
    )

    headers_b = autenticar(
        client,
        "fisio.b@example.com",
        "SenhaTeste123!",
    )

    paciente_a = criar_paciente(
        client,
        headers_a,
        "Paciente Clínica A",
        "11111111111",
    )

    paciente_b = criar_paciente(
        client,
        headers_b,
        "Paciente Clínica B",
        "22222222222",
    )

    return {
        "clinica_a": clinica_a,
        "clinica_b": clinica_b,
        "headers_a": headers_a,
        "headers_b": headers_b,
        "paciente_a": paciente_a,
        "paciente_b": paciente_b,
    }

def test_isolamento_de_dados_entre_clinicas(client):
    cenario = preparar_cenario(client)

    clinica_a = cenario["clinica_a"]
    clinica_b = cenario["clinica_b"]
    headers_a = cenario["headers_a"]
    headers_b = cenario["headers_b"]
    paciente_a = cenario["paciente_a"]
    paciente_b = cenario["paciente_b"]

    # Cadastro deve usar a clínica do usuário autenticado.
    assert paciente_a["clinica_id"] == clinica_a["id"]
    assert paciente_b["clinica_id"] == clinica_b["id"]

    # Clínica A deve listar somente seus próprios pacientes.
    response = client.get(
        "/api/pacientes",
        headers=headers_a,
    )

    assert response.status_code == 200

    pacientes_visiveis = response.json()

    ids_visiveis = {
        paciente["id"]
        for paciente in pacientes_visiveis
    }

    assert paciente_a["id"] in ids_visiveis
    assert paciente_b["id"] not in ids_visiveis

    assert all(
        paciente["clinica_id"] == clinica_a["id"]
        for paciente in pacientes_visiveis
    )

    # Clínica A não pode consultar prontuário de paciente da Clínica B.
    response = client.get(
        f"/api/consultas/paciente/{paciente_b['id']}",
        headers=headers_a,
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Paciente não encontrado."
    }

    # Clínica A não pode registrar consulta para paciente da Clínica B.
    response = client.post(
        "/api/consultas",
        headers=headers_a,
        json={
            "paciente_id": paciente_b["id"],
            "queixa_principal": "Tentativa de acesso cruzado",
            "diagnostico": "Teste",
            "prescricao": "Teste",
            "observacoes": "Teste automatizado",
        },
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Paciente não encontrado."
    }

    # O acesso legítimo da Clínica A deve continuar funcionando.
    response = client.post(
        "/api/consultas",
        headers=headers_a,
        json={
            "paciente_id": paciente_a["id"],
            "queixa_principal": "Dor no joelho",
            "diagnostico": "Teste",
            "prescricao": "Teste",
            "observacoes": "Teste automatizado",
        },
    )

    assert response.status_code == 201

    consulta = response.json()

    assert consulta["paciente_id"] == paciente_a["id"]

    # Clínica B continua podendo acessar seu próprio prontuário.
    response = client.get(
        f"/api/consultas/paciente/{paciente_b['id']}",
        headers=headers_b,
    )

    assert response.status_code == 200

def test_endpoints_clinicos_exigem_autenticacao(client):
    response = client.post(
        "/api/pacientes",
        json={
            "nome": "Paciente Sem Autenticação",
            "cpf": "33333333333",
            "data_nascimento": "1990-01-01",
            "telefone": "11999999999",
        },
    )
    assert response.status_code == 401

    response = client.get("/api/pacientes")
    assert response.status_code == 401

    response = client.post(
        "/api/consultas",
        json={
            "paciente_id": 1,
            "queixa_principal": "Teste",
            "diagnostico": "Teste",
            "prescricao": "Teste",
            "observacoes": "Teste",
        },
    )
    assert response.status_code == 401

    response = client.get("/api/consultas/paciente/1")
    assert response.status_code == 401