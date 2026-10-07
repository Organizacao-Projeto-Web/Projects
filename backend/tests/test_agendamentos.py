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
            "crefito": crefito,
            "cargo": cargo,
        },
    )

    assert response.status_code == 201, response.json()

    return response.json()


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


def test_admin_pode_criar_agendamento(client):
    cadastro = criar_clinica_admin(
        client,
        nome_clinica="Clínica Agenda",
        cnpj="11111111000111",
        nome_admin="Administrador Agenda",
        email_admin="admin.agenda@example.com",
        crefito="11111-F",
    )

    headers_admin = login(
        client,
        "admin.agenda@example.com",
    )

    paciente = criar_paciente(
        client,
        headers_admin,
        nome="Paciente Agenda",
        cpf="11111111111",
    )

    admin_id = cadastro["responsavel"]["id"]

    response = client.post(
        "/api/agendamentos",
        headers=headers_admin,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": admin_id,
            "data_hora": "2026-10-20T10:00:00",
            "duracao_minutos": 60,
            "observacoes": "Primeira avaliação",
        },
    )

    assert response.status_code == 201, response.json()

    dados = response.json()

    assert dados["paciente_id"] == paciente["id"]
    assert dados["profissional_id"] == admin_id
    assert dados["clinica_id"] == cadastro["clinica"]["id"]
    assert dados["status"] == "agendado"
    assert dados["duracao_minutos"] == 60


def test_nao_permite_conflito_de_horario(client):
    cadastro = criar_clinica_admin(
        client,
        nome_clinica="Clínica Conflito",
        cnpj="22222222000122",
        nome_admin="Administrador Conflito",
        email_admin="admin.conflito@example.com",
        crefito="22222-F",
    )

    headers_admin = login(
        client,
        "admin.conflito@example.com",
    )

    paciente = criar_paciente(
        client,
        headers_admin,
        nome="Paciente Conflito",
        cpf="22222222222",
    )

    admin_id = cadastro["responsavel"]["id"]

    primeiro = client.post(
        "/api/agendamentos",
        headers=headers_admin,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": admin_id,
            "data_hora": "2026-10-20T10:00:00",
            "duracao_minutos": 60,
        },
    )

    assert primeiro.status_code == 201

    conflito = client.post(
        "/api/agendamentos",
        headers=headers_admin,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": admin_id,
            "data_hora": "2026-10-20T10:30:00",
            "duracao_minutos": 60,
        },
    )

    assert conflito.status_code == 409
    assert conflito.json() == {
        "detail": ("Já existe um agendamento para este profissional " "nesse horário.")
    }


def test_agendamento_respeita_isolamento_entre_clinicas(client):
    cadastro_a = criar_clinica_admin(
        client,
        nome_clinica="Clínica Agenda A",
        cnpj="33333333000133",
        nome_admin="Administrador A",
        email_admin="admin.a.agenda@example.com",
        crefito="33333-F",
    )

    cadastro_b = criar_clinica_admin(
        client,
        nome_clinica="Clínica Agenda B",
        cnpj="44444444000144",
        nome_admin="Administrador B",
        email_admin="admin.b.agenda@example.com",
        crefito="44444-F",
    )

    headers_a = login(
        client,
        "admin.a.agenda@example.com",
    )

    headers_b = login(
        client,
        "admin.b.agenda@example.com",
    )

    paciente_b = criar_paciente(
        client,
        headers_b,
        nome="Paciente Clínica B",
        cpf="33333333333",
    )

    response = client.post(
        "/api/agendamentos",
        headers=headers_a,
        json={
            "paciente_id": paciente_b["id"],
            "profissional_id": cadastro_a["responsavel"]["id"],
            "data_hora": "2026-10-21T09:00:00",
            "duracao_minutos": 60,
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Paciente não encontrado."}

    response_profissional = client.post(
        "/api/agendamentos",
        headers=headers_a,
        json={
            "paciente_id": criar_paciente(
                client,
                headers_a,
                nome="Paciente Clínica A",
                cpf="44444444444",
            )["id"],
            "profissional_id": cadastro_b["responsavel"]["id"],
            "data_hora": "2026-10-21T11:00:00",
            "duracao_minutos": 60,
        },
    )

    assert response_profissional.status_code == 404
    assert response_profissional.json() == {"detail": "Profissional não encontrado."}


def test_recepcao_pode_criar_agendamento(client):
    cadastro = criar_clinica_admin(
        client,
        nome_clinica="Clínica Recepção Agenda",
        cnpj="55555555000155",
        nome_admin="Administrador Recepção",
        email_admin="admin.recepcao.agenda@example.com",
        crefito="55555-F",
    )

    headers_admin = login(
        client,
        "admin.recepcao.agenda@example.com",
    )

    criar_usuario(
        client,
        headers_admin,
        nome="Recepcionista Agenda",
        email="recepcao.agenda@example.com",
        cargo="recepcao",
        crefito="REC-AGENDA",
    )

    paciente = criar_paciente(
        client,
        headers_admin,
        nome="Paciente Recepção",
        cpf="55555555555",
    )

    headers_recepcao = login(
        client,
        "recepcao.agenda@example.com",
    )

    response = client.post(
        "/api/agendamentos",
        headers=headers_recepcao,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": cadastro["responsavel"]["id"],
            "data_hora": "2026-10-22T14:00:00",
            "duracao_minutos": 60,
        },
    )

    assert response.status_code == 201, response.json()


def test_fisioterapeuta_so_pode_agendar_para_si_mesmo(client):
    criar_clinica_admin(
        client,
        nome_clinica="Clínica Fisioterapeutas",
        cnpj="66666666000166",
        nome_admin="Administrador Fisioterapeutas",
        email_admin="admin.fisios@example.com",
        crefito="66666-F",
    )

    headers_admin = login(
        client,
        "admin.fisios@example.com",
    )

    fisio_a = criar_usuario(
        client,
        headers_admin,
        nome="Fisioterapeuta A",
        email="fisio.a@example.com",
        cargo="fisioterapeuta",
        crefito="FISIO-A",
    )

    fisio_b = criar_usuario(
        client,
        headers_admin,
        nome="Fisioterapeuta B",
        email="fisio.b@example.com",
        cargo="fisioterapeuta",
        crefito="FISIO-B",
    )

    paciente = criar_paciente(
        client,
        headers_admin,
        nome="Paciente Fisioterapeuta",
        cpf="66666666666",
    )

    headers_fisio_a = login(
        client,
        "fisio.a@example.com",
    )

    proprio = client.post(
        "/api/agendamentos",
        headers=headers_fisio_a,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": fisio_a["id"],
            "data_hora": "2026-10-23T08:00:00",
            "duracao_minutos": 60,
        },
    )

    assert proprio.status_code == 201, proprio.json()

    outro = client.post(
        "/api/agendamentos",
        headers=headers_fisio_a,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": fisio_b["id"],
            "data_hora": "2026-10-23T10:00:00",
            "duracao_minutos": 60,
        },
    )

    assert outro.status_code == 403
    assert outro.json() == {
        "detail": ("O fisioterapeuta só pode criar agendamentos " "para si mesmo.")
    }

    lista = client.get(
        "/api/agendamentos",
        headers=headers_fisio_a,
    )

    assert lista.status_code == 200

    agendamentos = lista.json()

    assert len(agendamentos) == 1
    assert agendamentos[0]["profissional_id"] == fisio_a["id"]


def test_cancelamento_libera_horario(client):
    cadastro = criar_clinica_admin(
        client,
        nome_clinica="Clínica Cancelamento",
        cnpj="77777777000177",
        nome_admin="Administrador Cancelamento",
        email_admin="admin.cancelamento@example.com",
        crefito="77777-F",
    )

    headers_admin = login(
        client,
        "admin.cancelamento@example.com",
    )

    paciente = criar_paciente(
        client,
        headers_admin,
        nome="Paciente Cancelamento",
        cpf="77777777777",
    )

    admin_id = cadastro["responsavel"]["id"]

    criar = client.post(
        "/api/agendamentos",
        headers=headers_admin,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": admin_id,
            "data_hora": "2026-10-24T15:00:00",
            "duracao_minutos": 60,
        },
    )

    assert criar.status_code == 201

    agendamento_id = criar.json()["id"]

    cancelar = client.patch(
        f"/api/agendamentos/{agendamento_id}/status",
        headers=headers_admin,
        json={
            "status": "cancelado",
        },
    )

    assert cancelar.status_code == 200
    assert cancelar.json()["status"] == "cancelado"

    novo = client.post(
        "/api/agendamentos",
        headers=headers_admin,
        json={
            "paciente_id": paciente["id"],
            "profissional_id": admin_id,
            "data_hora": "2026-10-24T15:00:00",
            "duracao_minutos": 60,
        },
    )

    assert novo.status_code == 201, novo.json()
