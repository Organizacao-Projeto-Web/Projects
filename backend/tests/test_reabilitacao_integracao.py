from test_avaliacoes_clinicas import contexto, url  # noqa: F401


def test_reabilitacao_v2_cria_e_consulta_com_isolamento(client, contexto):
    endpoint = url(contexto["paciente_a"])
    payload = {
        "modulo": "reabilitacao",
        "tipo": "avaliacao_inicial",
        "schema_versao": 2,
        "dados": {
            "queixa_principal": "Dificuldade para caminhar",
            "dor_atual": 0,
            "medidas": [
                {"regiao": "joelho", "amplitude_graus": 98.5, "forca_manual": 0}
            ],
            "exercicios": [{"nome": "Exercício", "series": 3, "repeticoes": 12}],
        },
    }
    assert client.post(endpoint, json=payload).status_code == 401
    assert (
        client.post(endpoint, json=payload, headers=contexto["recepcao"]).status_code
        == 403
    )
    assert client.get(endpoint, headers=contexto["recepcao"]).status_code == 403
    assert (
        client.post(
            url(contexto["paciente_b"]), json=payload, headers=contexto["admin"]
        ).status_code
        == 404
    )
    r = client.post(endpoint, json=payload, headers=contexto["fisio"])
    assert r.status_code == 201, r.json()
    result = r.json()
    assert result["modulo"] == "reabilitacao" and result["schema_versao"] == 2
    assert result["dados"]["medidas"][0]["forca_manual"] == 0
    item_url = f"/api/avaliacoes/{result['id']}"
    assert client.get(item_url, headers=contexto["admin_b"]).status_code == 404
    assert client.get(item_url, headers=contexto["recepcao"]).status_code == 403
    assert client.get(item_url, headers=contexto["admin"]).status_code == 200
    listing = client.get(
        endpoint, params={"modulo": "reabilitacao"}, headers=contexto["admin"]
    )
    assert listing.status_code == 200 and any(
        x["id"] == result["id"] for x in listing.json()
    )


def test_reabilitacao_v2_valida_corpo(client, contexto):
    endpoint = url(contexto["paciente_a"])
    body = {
        "modulo": "reabilitacao",
        "tipo": "evolucao",
        "schema_versao": 2,
        "dados": {
            "queixa_principal": "Queixa",
            "medidas": [{"regiao": "ombro", "forca_manual": 9}],
        },
    }
    assert (
        client.post(endpoint, json=body, headers=contexto["fisio"]).status_code == 422
    )
