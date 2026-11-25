from test_avaliacoes_clinicas import contexto, url  # noqa: F401


def test_climaterio_v2_cria_lista_e_protege(client, contexto):
    endpoint = url(contexto["paciente_a"])
    body = {
        "modulo": "climaterio",
        "tipo": "avaliacao_inicial",
        "schema_versao": 2,
        "dados": {
            "queixa_principal": "Fogachos relatados",
            "dor_atual": 0,
            "estagio_informado": "peri",
            "sintomas": ["fogachos", "alteracao_sono"],
            "quedas_ultimos_12_meses": 0,
        },
    }
    assert client.post(endpoint, json=body).status_code == 401
    assert (
        client.post(endpoint, json=body, headers=contexto["recepcao"]).status_code
        == 403
    )
    assert client.get(endpoint, headers=contexto["recepcao"]).status_code == 403
    assert (
        client.post(
            url(contexto["paciente_b"]), json=body, headers=contexto["fisio"]
        ).status_code
        == 404
    )
    r = client.post(endpoint, json=body, headers=contexto["fisio"])
    assert r.status_code == 201, r.json()
    result = r.json()
    assert result["schema_versao"] == 2
    assert result["dados"]["quedas_ultimos_12_meses"] == 0
    item_url = f"/api/avaliacoes/{result['id']}"
    assert client.get(item_url, headers=contexto["admin_b"]).status_code == 404
    assert client.get(item_url, headers=contexto["recepcao"]).status_code == 403
    assert client.get(item_url, headers=contexto["admin"]).status_code == 200
    listing = client.get(
        endpoint, params={"modulo": "climaterio"}, headers=contexto["admin"]
    )
    assert listing.status_code == 200 and any(
        x["id"] == result["id"] for x in listing.json()
    )


def test_climaterio_v2_rejeita_corpo_invalido(client, contexto):
    endpoint = url(contexto["paciente_a"])
    payload = {
        "modulo": "climaterio",
        "tipo": "evolucao",
        "schema_versao": 2,
        "dados": {"queixa_principal": "Queixa", "estagio_informado": "impossivel"},
    }
    assert (
        client.post(endpoint, json=payload, headers=contexto["fisio"]).status_code
        == 422
    )
