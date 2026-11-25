from datetime import datetime
import pytest
from pydantic import TypeAdapter, ValidationError
from app.schemas.clinical_assessment import AvaliacaoCreate, AvaliacaoResponse

BASE = {"modulo": "reabilitacao", "tipo": "avaliacao_inicial", "schema_versao": 2}


def assess(dados):
    return TypeAdapter(AvaliacaoCreate).validate_python({**BASE, "dados": dados})


def test_reabilitacao_v2_medidas_exercicios_e_zeroforca():
    obj = assess(
        {
            "queixa_principal": "Dificuldade para caminhar",
            "dor_atual": 0,
            "medidas": [
                {
                    "regiao": "joelho",
                    "movimento": "flexao",
                    "amplitude_graus": 98.5,
                    "forca_manual": 0,
                }
            ],
            "exercicios": [
                {"nome": "Exercício informado", "series": 3, "repeticoes": 12}
            ],
            "meta_autonomia": "Caminhar com segurança",
        }
    )
    assert obj.dados.medidas[0].forca_manual == 0
    assert obj.dados.medidas[0].amplitude_graus == 98.5
    assert obj.dados.exercicios[0].repeticoes == 12
    assert obj.dados.testes_funcionais is None


def test_reabilitacao_v1_e_demais_modulos_coexistem():
    adapter = TypeAdapter(AvaliacaoCreate)
    for modulo in ("reabilitacao", "pelvica", "gestacao_posparto", "climaterio"):
        assert (
            adapter.validate_python(
                {"modulo": modulo, "tipo": "evolucao", "dados": {"dor_atual": 0}}
            ).schema_versao
            == 1
        )
    assert (
        adapter.validate_python(
            {
                "modulo": "pelvica",
                "tipo": "evolucao",
                "schema_versao": 2,
                "dados": {"dor_atual": 1},
            }
        ).schema_versao
        == 2
    )
    assert (
        adapter.validate_python(
            {
                "modulo": "gestacao_posparto",
                "tipo": "evolucao",
                "schema_versao": 2,
                "dados": {"fase": "posparto", "posparto": {}},
            }
        ).schema_versao
        == 2
    )


@pytest.mark.parametrize(
    "dados",
    [
        {"queixa_principal": "A", "medidas": [{"regiao": "joelho"}]},
        {
            "queixa_principal": "A",
            "medidas": [{"regiao": "invalida", "forca_manual": 2}],
        },
        {"queixa_principal": "A", "medidas": [{"regiao": "ombro", "forca_manual": 6}]},
        {
            "queixa_principal": "A",
            "medidas": [{"regiao": "ombro", "forca_manual": 1.5}],
        },
        {
            "queixa_principal": "A",
            "medidas": [{"regiao": "ombro", "amplitude_graus": 361}],
        },
        {
            "queixa_principal": "A",
            "medidas": [{"regiao": "ombro", "forca_manual": 0, "campo_extra": 1}],
        },
        {"queixa_principal": "A", "exercicios": [{"nome": ""}]},
        {"queixa_principal": "A", "exercicios": [{"nome": "Extensao", "series": 0}]},
        {
            "queixa_principal": "A",
            "exercicios": [{"nome": "Extensao", "repeticoes": 301}],
        },
        {"queixa_principal": "A", "exercicios": [{"nome": "Extensao", "campo": 1}]},
        {"queixa_principal": "A", "diagnostico_informado": "A" * 2001},
        {"queixa_principal": "A", "campo_desconhecido": "x"},
        {
            "queixa_principal": "A",
            "medidas": [{"regiao": "ombro", "forca_manual": 2}] * 13,
        },
        {"queixa_principal": "A", "exercicios": [{"nome": "Extensao"}] * 21},
    ],
)
def test_rejeita_dados_invalidos(dados):
    with pytest.raises(ValidationError):
        assess(dados)


def test_resposta_v2_preserva_dados_reabilitacao():
    data = assess(
        {
            "queixa_principal": "Teste",
            "medidas": [{"regiao": "joelho", "forca_manual": 0}],
        }
    )
    response = AvaliacaoResponse.model_validate(
        {
            "id": 1,
            "clinica_id": 1,
            "paciente_id": 1,
            "profissional_id": 1,
            "consulta_id": None,
            "agendamento_id": None,
            "modulo": "reabilitacao",
            "tipo": "avaliacao_inicial",
            "schema_versao": 2,
            "dados": data.dados.model_dump(mode="json"),
            "status": "registrada",
            "created_at": datetime(2026, 11, 24),
        }
    )
    assert response.dados["medidas"][0]["forca_manual"] == 0
    assert response.dados["medidas"][0]["amplitude_graus"] is None
