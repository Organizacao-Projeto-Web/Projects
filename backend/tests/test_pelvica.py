from datetime import datetime
import pytest
from pydantic import TypeAdapter, ValidationError
from app.schemas.clinical_assessment import (
    AvaliacaoCreate,
    AvaliacaoResponse,
    DadosPelvicaV2,
    ICIQSFV2,
)

VALIDO = {
    "modulo": "pelvica",
    "tipo": "avaliacao_inicial",
    "schema_versao": 2,
    "dados": {
        "queixa_principal": "Incontinência aos esforços",
        "sintomas": ["incontinencia_esforco"],
        "dor_atual": 0,
        "gestacoes": 2,
        "partos": 1,
        "forca_oxford": 3,
        "iciq_sf": {"frequencia": 2, "quantidade": 4, "interferencia": 7},
        "diario_miccional": {
            "data_inicio": "2026-11-20",
            "data_fim": "2026-11-22",
            "miccoes_por_dia": 7,
            "nocturia_por_noite": 2,
        },
    },
}


def test_versao2_pelvica_e_pontuacao_informativa():
    registro = TypeAdapter(AvaliacaoCreate).validate_python(VALIDO)
    assert registro.schema_versao == 2
    assert registro.dados.iciq_sf.pontuacao_total == 13
    assert registro.dados.dor_atual == 0
    assert registro.dados.diario_miccional.nocturia_por_noite == 2


def test_v1_permanece_aceita():
    registro = TypeAdapter(AvaliacaoCreate).validate_python(
        {
            "modulo": "pelvica",
            "tipo": "avaliacao_inicial",
            "schema_versao": 1,
            "dados": {"dor_atual": 3},
        }
    )
    assert registro.schema_versao == 1


@pytest.mark.parametrize(
    "campo,valor",
    [
        ("dor_atual", -1),
        ("dor_atual", 11),
        ("forca_oxford", 6),
        ("gestacoes", -1),
        ("sintomas", ["nao_existe"]),
        ("campo_nao_autorizado", "x"),
        ("diario_miccional", {"data_inicio": "2026-11-23", "data_fim": "2026-11-20"}),
        ("iciq_sf", {"frequencia": 9, "quantidade": 4, "interferencia": 7}),
    ],
)
def test_rejeita_invalidos(campo, valor):
    payload = {**VALIDO, "dados": {**VALIDO["dados"], campo: valor}}
    with pytest.raises(ValidationError):
        TypeAdapter(AvaliacaoCreate).validate_python(payload)


def test_partos_maiores_que_gestacoes_rejeitados():
    with pytest.raises(ValidationError):
        DadosPelvicaV2(queixa_principal="Teste", gestacoes=1, partos=3)


def test_pontuacao_recalculada_sem_confiar_no_cliente():
    calculo = ICIQSFV2(frequencia=5, quantidade=6, interferencia=10, pontuacao_total=0)
    assert calculo.pontuacao_total == 21


def test_resposta_preserva_dados_especializados():
    payload = TypeAdapter(AvaliacaoCreate).validate_python(VALIDO)
    resposta = AvaliacaoResponse.model_validate(
        {
            "id": 1,
            "clinica_id": 1,
            "paciente_id": 2,
            "profissional_id": 3,
            "consulta_id": None,
            "agendamento_id": None,
            "modulo": "pelvica",
            "tipo": "avaliacao_inicial",
            "schema_versao": 2,
            "dados": payload.dados.model_dump(mode="json", by_alias=True),
            "status": "registrada",
            "created_at": datetime(2026, 11, 24),
        }
    )
    assert resposta.dados["forca_oxford"] == 3
    assert resposta.dados["iciq_sf"]["pontuacao_total"] == 13
