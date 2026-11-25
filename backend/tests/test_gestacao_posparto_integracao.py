from test_avaliacoes_clinicas import contexto, url  # noqa: F401


def test_gestacao_posparto_v2_cria_lista_404_403(client, contexto):
    endpoint = url(contexto["paciente_a"])
    for fase, bloco in [
        (
            "gestacao",
            {"gestacao": {"dum": "2026-09-01", "data_avaliacao": "2026-11-24"}},
        ),
        (
            "posparto",
            {"posparto": {"data_parto": "2026-10-15", "via_parto": "vaginal"}},
        ),
    ]:
        payload = {
            "modulo": "gestacao_posparto",
            "tipo": "avaliacao_inicial",
            "schema_versao": 2,
            "dados": {"queixa_principal": "Queixa relatada", "fase": fase, **bloco},
        }
        created = client.post(endpoint, json=payload, headers=contexto["fisio"])
        assert created.status_code == 201, created.json()
        assert created.json()["dados"]["fase"] == fase
        by_id = f"/api/avaliacoes/{created.json()['id']}"
        assert client.get(by_id, headers=contexto["admin_b"]).status_code == 404
        assert client.get(by_id, headers=contexto["recepcao"]).status_code == 403
        assert (
            client.post(
                url(contexto["paciente_b"]), json=payload, headers=contexto["admin"]
            ).status_code
            == 404
        )
    listing = client.get(
        endpoint, params={"modulo": "gestacao_posparto"}, headers=contexto["admin"]
    )
    assert listing.status_code == 200, listing.json()
    assert len(listing.json()) >= 2


def test_gestacao_posparto_v2_campos_invalidos_422(client, contexto):
    payload = {
        "modulo": "gestacao_posparto",
        "tipo": "avaliacao_inicial",
        "schema_versao": 2,
        "dados": {
            "fase": "posparto",
            "queixa_principal": "Teste",
            "posparto": {"diastase_cm": 50},
        },
    }
    assert (
        client.post(
            url(contexto["paciente_a"]), json=payload, headers=contexto["fisio"]
        ).status_code
        == 422
    )
