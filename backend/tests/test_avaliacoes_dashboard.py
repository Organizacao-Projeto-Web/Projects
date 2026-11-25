"""Acesso restrito e escopo por clínica dos totais de avaliações."""
from test_avaliacoes_clinicas import contexto, dados, url  # noqa: F401


def test_contagens_exigem_autenticacao_e_perfil_clinico(client, contexto):
    endpoint = "/api/dashboard/avaliacoes-por-modulo"
    assert client.get(endpoint).status_code == 401
    assert client.get(endpoint, headers=contexto["recepcao"]).status_code == 403
    for cargo in ("admin", "fisio"):
        resposta = client.get(endpoint, headers=contexto[cargo])
        assert resposta.status_code == 200
        assert len(resposta.json()) == 4
        assert all(item["total"] == 0 for item in resposta.json())


def test_contagens_apenas_da_clinica(client, contexto):
    endpoint = "/api/dashboard/avaliacoes-por-modulo"
    p_a = contexto["paciente_a"]
    p_b = contexto["paciente_b"]
    assert client.post(url(p_a), headers=contexto["admin"], json=dados("pelvica")).status_code == 201
    assert client.post(url(p_a), headers=contexto["fisio"], json=dados("reabilitacao")).status_code == 201
    assert client.post(url(p_b), headers=contexto["admin_b"], json=dados("pelvica")).status_code == 201
    a = client.get(endpoint, headers=contexto["admin"])
    b = client.get(endpoint, headers=contexto["admin_b"])
    assert a.status_code == 200 and b.status_code == 200
    assert {r["modulo"]: r["total"] for r in a.json()} == {
        "pelvica": 1, "gestacao_posparto": 0, "reabilitacao": 1, "climaterio": 0,
    }
    assert {r["modulo"]: r["total"] for r in b.json()} == {
        "pelvica": 1, "gestacao_posparto": 0, "reabilitacao": 0, "climaterio": 0,
    }


def test_vinculo_nao_aceita_outro_profissional_ou_agendamento_cancelado(client, contexto):
    from datetime import datetime, timedelta
    agendamento = {
        "paciente_id": contexto["paciente_a"]["id"],
        "profissional_id": contexto["a"]["responsavel"]["id"],
        "data_hora": (datetime.now() + timedelta(days=60)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat(),
        "duracao_minutos": 60,
        "observacoes": None,
    }
    response = client.post("/api/agendamentos", json=agendamento, headers=contexto["admin"])
    assert response.status_code == 201, response.json()
    agendamento_id = response.json()["id"]
    payload = dados("reabilitacao", agendamento_id=agendamento_id)
    assert client.post(url(contexto["paciente_a"]), json=payload, headers=contexto["fisio"]).status_code == 404
    assert client.post(url(contexto["paciente_a"]), json=payload, headers=contexto["admin"]).status_code == 201
    canceled = client.patch(f"/api/agendamentos/{agendamento_id}/status", json={"status": "cancelado"}, headers=contexto["admin"])
    assert canceled.status_code == 200, canceled.json()
    assert client.post(url(contexto["paciente_a"]), json=payload, headers=contexto["admin"]).status_code == 409
