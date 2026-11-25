from test_avaliacoes_clinicas import contexto, url  # noqa: F401


def test_pelvica_v2_api_e_isolamento(client, contexto):
    """O endpoint grava e devolve os campos estruturados, sem cruzar clínicas."""
    payload = {
        "modulo": "pelvica",
        "tipo": "avaliacao_inicial",
        "schema_versao": 2,
        "dados": {
            "queixa_principal": "Incontinência aos esforços",
            "dor_atual": 0,
            "sintomas": ["incontinencia_esforco", "nocturia"],
            "gestacoes": 2,
            "partos": 1,
            "forca_oxford": 2,
            "iciq_sf": {"frequencia": 2, "quantidade": 4, "interferencia": 5},
            "diario_miccional": {
                "data_inicio": "2026-11-20",
                "data_fim": "2026-11-22",
                "miccoes_por_dia": 6.5,
                "nocturia_por_noite": 2,
            },
        },
    }
    endpoint = url(contexto["paciente_a"])
    r = client.post(endpoint, json=payload, headers=contexto["fisio"])
    assert r.status_code == 201, r.json()
    body = r.json()
    assert body["schema_versao"] == 2
    assert body["dados"]["forca_oxford"] == 2
    assert body["dados"]["iciq_sf"]["pontuacao_total"] == 11
    assert body["dados"]["diario_miccional"]["miccoes_por_dia"] == 6.5
    listing = client.get(endpoint, headers=contexto["admin"])
    assert listing.status_code == 200
    assert listing.json()[0]["dados"]["sintomas"] == [
        "incontinencia_esforco",
        "nocturia",
    ]
    by_id = f"/api/avaliacoes/{body['id']}"
    assert client.get(by_id, headers=contexto["admin_b"]).status_code == 404
    assert client.get(by_id, headers=contexto["recepcao"]).status_code == 403


def test_pelvica_v2_api_rejeita_campos_e_escalas_invalidas(client, contexto):
    endpoint = url(contexto["paciente_a"])
    invalidos = [
        {"dor_atual": 11},
        {"forca_oxford": -1},
        {"iciq_sf": {"frequencia": 3, "quantidade": 5, "interferencia": 0}},
        {"diario_miccional": {"data_inicio": "2026-11-22", "data_fim": "2026-11-20"}},
        {"outro_campo": "informação arbitrária"},
    ]
    for dados_especificos in invalidos:
        r = client.post(
            endpoint,
            headers=contexto["admin"],
            json={
                "modulo": "pelvica",
                "tipo": "evolucao",
                "schema_versao": 2,
                "dados": {"queixa_principal": "Queixa relatada", **dados_especificos},
            },
        )
        assert r.status_code == 422, r.json()
