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
                "whatsapp": "5575999999999",
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

    ids_visiveis = {paciente["id"] for paciente in pacientes_visiveis}

    assert paciente_a["id"] in ids_visiveis
    assert paciente_b["id"] not in ids_visiveis

    assert all(
        paciente["clinica_id"] == clinica_a["id"] for paciente in pacientes_visiveis
    )

    # Clínica A não pode consultar prontuário de paciente da Clínica B.
    response = client.get(
        f"/api/consultas/paciente/{paciente_b['id']}",
        headers=headers_a,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Paciente não encontrado."}

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
    assert response.json() == {"detail": "Paciente não encontrado."}

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


def test_buscar_paciente_por_id_respeita_clinica(client):
    cenario = preparar_cenario(client)

    paciente_a = cenario["paciente_a"]
    paciente_b = cenario["paciente_b"]
    headers_a = cenario["headers_a"]

    # Paciente da própria clínica
    response = client.get(
        f"/api/pacientes/{paciente_a['id']}",
        headers=headers_a,
    )
    assert response.status_code == 200
    assert response.json()["id"] == paciente_a["id"]

    # Paciente de outra clínica
    response = client.get(
        f"/api/pacientes/{paciente_b['id']}",
        headers=headers_a,
    )
    assert response.status_code == 404

    # Paciente inexistente
    response = client.get(
        "/api/pacientes/999999999",
        headers=headers_a,
    )
    assert response.status_code == 404

    # Sem autenticação
    response = client.get(
        f"/api/pacientes/{paciente_a['id']}",
    )
    assert response.status_code == 401


def test_atualizar_paciente_parcialmente(client):
    cenario = preparar_cenario(client)

    paciente = cenario["paciente_a"]
    headers = cenario["headers_a"]

    response = client.patch(
        f"/api/pacientes/{paciente['id']}",
        headers=headers,
        json={"telefone": "75999999999"},
    )

    print("DETALHES DO ERRO:", response.json())

    assert response.status_code == 200

    atualizado = response.json()

    assert atualizado["id"] == paciente["id"]
    assert atualizado["nome"] == paciente["nome"]
    assert atualizado["cpf"] == paciente["cpf"]
    assert atualizado["telefone"] == "75999999999"


def test_atualizacao_paciente_bloqueia_outra_clinica(client):
    cenario = preparar_cenario(client)

    paciente_b = cenario["paciente_b"]
    headers_a = cenario["headers_a"]
    headers_b = cenario["headers_b"]

    telefone_original = paciente_b["telefone"]

    response = client.patch(
        f"/api/pacientes/{paciente_b['id']}",
        headers=headers_a,
        json={"telefone": "75988887777"},
    )

    assert response.status_code == 404

    # Confirma que o cadastro original não foi alterado.
    response = client.get(
        f"/api/pacientes/{paciente_b['id']}",
        headers=headers_b,
    )

    assert response.status_code == 200
    assert response.json()["telefone"] == telefone_original


def test_atualizar_paciente_com_cpf_duplicado(client):
    cenario = preparar_cenario(client)

    paciente_a = cenario["paciente_a"]
    headers_a = cenario["headers_a"]

    # Cria outra paciente com CPF diferente.
    response = client.post(
        "/api/pacientes",
        headers=headers_a,
        json={
            "nome": "Paciente Teste CPF",
            "cpf": "12345678901",
        },
    )
    assert response.status_code == 201

    outra_paciente = response.json()

    # Tenta atribuir o mesmo CPF à primeira paciente.
    response = client.patch(
        f"/api/pacientes/{paciente_a['id']}",
        headers=headers_a,
        json={"cpf": outra_paciente["cpf"]},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "CPF já cadastrado."


def test_atualizar_paciente_rejeita_dados_invalidos(client):
    cenario = preparar_cenario(client)

    paciente = cenario["paciente_a"]
    headers = cenario["headers_a"]
    url = f"/api/pacientes/{paciente['id']}"

    casos_invalidos = [
        {"nome": None},
        {"nome": ""},
        {"cpf": "123"},
        {"telefone": "123"},
        {"clinica_id": 999},
        {"id": 999},
        {"created_at": "2026-01-01T00:00:00"},
    ]

    for dados in casos_invalidos:
        response = client.patch(
            url,
            headers=headers,
            json=dados,
        )

        assert response.status_code == 422, (
            f"Dados {dados} retornaram {response.status_code}: " f"{response.json()}"
        )


def test_atualizar_paciente_permite_limpar_campos_opcionais(client):
    cenario = preparar_cenario(client)

    paciente = cenario["paciente_a"]
    headers = cenario["headers_a"]

    response = client.patch(
        f"/api/pacientes/{paciente['id']}",
        headers=headers,
        json={
            "cpf": None,
            "telefone": None,
            "data_nascimento": None,
        },
    )

    assert response.status_code == 200

    atualizado = response.json()

    assert atualizado["id"] == paciente["id"]
    assert atualizado["nome"] == paciente["nome"]
    assert atualizado["cpf"] is None
    assert atualizado["telefone"] is None
    assert atualizado["data_nascimento"] is None
