from datetime import datetime
import pytest
from pydantic import TypeAdapter, ValidationError
from app.schemas.clinical_assessment import AvaliacaoCreate, AvaliacaoResponse

BASE = {"modulo": "gestacao_posparto", "tipo": "avaliacao_inicial", "schema_versao": 2}


def test_gestacao_calcula_ig_da_data_informada():
    registro = TypeAdapter(AvaliacaoCreate).validate_python(
        {
            **BASE,
            "dados": {
                "fase": "gestacao",
                "queixa_principal": "Dor lombar",
                "gestacao": {
                    "dum": "2026-09-01",
                    "data_avaliacao": "2026-11-24",
                    "gestacoes": 1,
                    "partos": 0,
                },
            },
        }
    )
    assert registro.dados.gestacao.idade_gestacional_dias == 84
    assert registro.dados.posparto is None


def test_posparto_preserva_nao_informado_e_zero():
    registro = TypeAdapter(AvaliacaoCreate).validate_python(
        {
            **BASE,
            "dados": {
                "fase": "posparto",
                "observacoes": "Relato da paciente",
                "posparto": {"diastase_cm": 0, "amamentacao": False},
            },
        }
    )
    assert registro.dados.posparto.diastase_cm == 0
    assert registro.dados.posparto.amamentacao is False
    assert registro.dados.posparto.via_parto is None


def test_v1_e_pelvica_v2_preservadas():
    adapter = TypeAdapter(AvaliacaoCreate)
    assert (
        adapter.validate_python(
            {
                "modulo": "gestacao_posparto",
                "tipo": "evolucao",
                "dados": {"dor_atual": 0},
            }
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


@pytest.mark.parametrize(
    "dados",
    [
        {
            "fase": "gestacao",
            "gestacao": {"dum": "2026-11-24", "data_avaliacao": "2026-11-01"},
        },
        {"fase": "gestacao", "gestacao": {"gestacoes": -1}},
        {"fase": "gestacao", "gestacao": {"outro_campo": 3}},
        {"fase": "gestacao", "gestacao": {}, "posparto": {}},
        {"fase": "posparto", "posparto": {"diastase_cm": -1}},
        {"fase": "posparto", "posparto": {"via_parto": "desconhecida"}},
        {"fase": "posparto", "posparto": {}, "outro_campo": 2},
        {"fase": "gestacao", "posparto": {}},
    ],
)
def test_rejeita_invalidos(dados):
    with pytest.raises(ValidationError):
        TypeAdapter(AvaliacaoCreate).validate_python(
            {**BASE, "dados": {"queixa_principal": "Teste", **dados}}
        )


def test_resposta_preserva_gestacao_v2():
    data = TypeAdapter(AvaliacaoCreate).validate_python(
        {
            **BASE,
            "dados": {
                "fase": "gestacao",
                "queixa_principal": "Queixa",
                "gestacao": {"dum": "2026-09-01", "data_avaliacao": "2026-11-24"},
            },
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
            "modulo": "gestacao_posparto",
            "tipo": "avaliacao_inicial",
            "schema_versao": 2,
            "dados": data.dados.model_dump(mode="json"),
            "status": "registrada",
            "created_at": datetime(2026, 11, 24),
        }
    )
    assert response.dados["gestacao"]["idade_gestacional_dias"] == 84
