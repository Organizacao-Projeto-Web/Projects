import pytest

SENHA = "SenhaTeste123!"


def clinica(client, sufixo: int):
    resposta = client.post(
        "/api/cadastro",
        json={
            "clinica": {
                "nome": f"ClÃ­nica avaliaÃ§Ãµes {sufixo}",
                "cnpj": f"{sufixo:014d}",
            },
            "responsavel": {
                "nome": f"Admin avaliaÃ§Ãµes {sufixo}",
                "email": f"admin{ sufixo }@gmail.com",
                "senha": SENHA,
                "whatsapp": "75999990000",
                "crefito": "12345-F",
            },
        },
    )
    assert resposta.status_code == 201, resposta.json()
    return resposta.json()


def auth(client, email):
    r = client.post("/api/auth/login", data={"username": email, "password": SENHA})
    assert r.status_code == 200, r.json()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def paciente(client, headers, nome, cpf):
    r = client.post("/api/pacientes", headers=headers, json={"nome": nome, "cpf": cpf})
    assert r.status_code == 201, r.json()
    return r.json()


def usuario(client, headers, sufixo, cargo):
    email = f"{cargo}{sufixo}@gmail.com"
    r = client.post(
        "/api/usuarios",
        headers=headers,
        json={
            "nome": f"Profissional {sufixo}",
            "email": email,
            "senha": SENHA,
            "cargo": cargo,
            "whatsapp": "75999990000",
            "crefito": None,
        },
    )
    assert r.status_code == 201, r.json()
    return r.json(), auth(client, email)


def dados(modulo="pelvica", **kwargs):
    return {
        "modulo": modulo,
        "tipo": "avaliacao_inicial",
        "schema_versao": 1,
        "dados": {"queixa_principal": "AvaliaÃ§Ã£o funcional", "dor_atual": 0},
        **kwargs,
    }


@pytest.fixture
def contexto(client):
    a = clinica(client, 98765432100123)
    b = clinica(client, 98765432100124)
    headers_a = auth(client, a["responsavel"]["email"])
    headers_b = auth(client, b["responsavel"]["email"])
    paciente_a = paciente(client, headers_a, "Paciente um", "98765432101")
    paciente_b = paciente(client, headers_b, "Paciente dois", "98765432102")
    _, recepcao = usuario(client, headers_a, 1, "recepcao")
    _, fisio = usuario(client, headers_a, 2, "fisioterapeuta")
    return {
        "a": a,
        "b": b,
        "admin": headers_a,
        "admin_b": headers_b,
        "recepcao": recepcao,
        "fisio": fisio,
        "paciente_a": paciente_a,
        "paciente_b": paciente_b,
    }


def url(p):
    return f"/api/pacientes/{p['id']}/avaliacoes"


def test_sem_token_401_e_recepcao_403(client, contexto):
    endpoint = url(contexto["paciente_a"])
    assert client.post(endpoint, json=dados()).status_code == 401
    assert client.get(endpoint).status_code == 401
    assert client.get("/api/avaliacoes/1").status_code == 401
    assert (
        client.post(endpoint, json=dados(), headers=contexto["recepcao"]).status_code
        == 403
    )
    assert client.get(endpoint, headers=contexto["recepcao"]).status_code == 403
    assert (
        client.get("/api/avaliacoes/1", headers=contexto["recepcao"]).status_code == 403
    )


@pytest.mark.parametrize(
    "modulo", ["pelvica", "gestacao_posparto", "reabilitacao", "climaterio"]
)
def test_cria_lista_e_detalha_quatro_modulos(client, contexto, modulo):
    endpoint = url(contexto["paciente_a"])
    r = client.post(endpoint, json=dados(modulo), headers=contexto["fisio"])
    assert r.status_code == 201, r.json()
    reg = r.json()
    assert reg["modulo"] == modulo and reg["status"] == "registrada"
    assert reg["clinica_id"] == contexto["a"]["clinica"]["id"]
    assert reg["paciente_id"] == contexto["paciente_a"]["id"]
    assert reg["profissional_id"] != contexto["a"]["responsavel"]["id"]
    r = client.get(endpoint, params={"modulo": modulo}, headers=contexto["admin"])
    assert r.status_code == 200 and [x["id"] for x in r.json()] == [reg["id"]]
    r = client.get(f"/api/avaliacoes/{reg['id']}", headers=contexto["admin"])
    assert r.status_code == 200 and r.json()["dados"]["dor_atual"] == 0


def test_isolamento_leitura_e_escrita_404(client, contexto):
    endpoint_a = url(contexto["paciente_a"])
    endpoint_b = url(contexto["paciente_b"])
    r = client.post(endpoint_a, json=dados(), headers=contexto["admin"])
    assert r.status_code == 201, r.json()
    registro = r.json()
    assert (
        client.post(endpoint_b, json=dados(), headers=contexto["admin"]).status_code
        == 404
    )
    assert client.get(endpoint_b, headers=contexto["admin"]).status_code == 404
    assert (
        client.get(
            f"/api/avaliacoes/{registro['id']}", headers=contexto["admin_b"]
        ).status_code
        == 404
    )
    assert client.get(endpoint_a, headers=contexto["admin_b"]).status_code == 404


@pytest.mark.parametrize(
    "mudanca",
    [
        {"modulo": "invalido"},
        {"schema_versao": 3},
        {"tipo": "rascunho"},
        {"clinica_id": 2},
        {"profissional_id": 1},
        {"dados": {"dor_atual": -1}},
        {"dados": {"dor_atual": 11}},
        {"dados": {"dor_atual": 1.3}},
        {"dados": {"dor_atual": 4, "campo_secreto": "x"}},
        {"dados": {"percepcao_paciente": "otima"}},
        {"dados": {}},
        {"dados": {"observacoes": "a" * 4001}},
    ],
)
def test_validacao_422(client, contexto, mudanca):
    body = dados()
    body.update(mudanca)
    assert (
        client.post(
            url(contexto["paciente_a"]), json=body, headers=contexto["admin"]
        ).status_code
        == 422
    )


def test_autor_inativo_e_administrador_pode_criar(client, contexto, app_context):
    endpoint = url(contexto["paciente_a"])
    usuario_db, headers = usuario(client, contexto["admin"], 3, "fisioterapeuta")
    r = client.post(endpoint, json=dados("reabilitacao"), headers=contexto["admin"])
    assert r.status_code == 201
    assert r.json()["profissional_id"] == contexto["a"]["responsavel"]["id"]
    from app.models.user import UsuarioModel

    _, SessionLocal = app_context
    with SessionLocal() as db:
        db.query(UsuarioModel).filter(UsuarioModel.id == usuario_db["id"]).update(
            {"ativo": False}
        )
        db.commit()
    assert client.get(endpoint, headers=headers).status_code == 401
    assert client.post(endpoint, json=dados(), headers=headers).status_code == 401


def test_vinculos_consulta_e_agendamento_somente_mesma_paciente(client, contexto):
    # RelaÃ§Ãµes invÃ¡lidas nÃ£o podem apontar para recursos arbitrÃ¡rios.
    endpoint = url(contexto["paciente_a"])
    for campo in ("consulta_id", "agendamento_id"):
        r = client.post(
            endpoint, json=dados(**{campo: 999999}), headers=contexto["admin"]
        )
        assert r.status_code == 404
