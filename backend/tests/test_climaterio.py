from datetime import datetime
import pytest
from pydantic import TypeAdapter, ValidationError
from app.schemas.clinical_assessment import AvaliacaoCreate, AvaliacaoResponse

BASE = {"modulo": "climaterio", "tipo": "avaliacao_inicial", "schema_versao": 2}


def create(dados):
    return TypeAdapter(AvaliacaoCreate).validate_python({**BASE, "dados": dados})


def test_climaterio_registra_estagio_e_ausencia_sem_diagnostico():
    item = create(
        {
            "queixa_principal": "Dificuldade para dormir",
            "dor_atual": 0,
            "estagio_informado": "peri",
            "ultima_menstruacao": "2026-10-13",
            "terapia_hormonal_informada": "nao_sabe",
            "sintomas": ["fogachos", "alteracao_sono"],
            "quedas_ultimos_12_meses": 0,
            "qualidade_vida_relatada": "Interferência relatada",
        }
    )
    assert item.schema_versao == 2
    assert item.dados.estagio_informado == "peri"
    assert item.dados.terapia_hormonal_informada == "nao_sabe"
    assert item.dados.quedas_ultimos_12_meses == 0
    assert item.dados.sono_relatado is None
    assert item.dados.dor_atual == 0


def test_climaterio_v1_e_outros_modulos_mantidos():
    adapter = TypeAdapter(AvaliacaoCreate)
    for modulo in ("pelvica", "gestacao_posparto", "reabilitacao", "climaterio"):
        assert (
            adapter.validate_python(
                {"modulo": modulo, "tipo": "evolucao", "dados": {"dor_atual": 0}}
            ).schema_versao
            == 1
        )
    assert (
        adapter.validate_python(
            {
                "modulo": "reabilitacao",
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
        {"queixa_principal": "A", "estagio_informado": "desconhecido"},
        {"queixa_principal": "A", "terapia_hormonal_informada": "talvez"},
        {"queixa_principal": "A", "sintomas": ["x"]},
        {"queixa_principal": "A", "sintomas": ["fogachos", "fogachos"]},
        {"queixa_principal": "A", "sintomas": ["fogachos"] * 9},
        {"queixa_principal": "A", "quedas_ultimos_12_meses": -1},
        {"queixa_principal": "A", "quedas_ultimos_12_meses": 101},
        {"queixa_principal": "A", "quedas_ultimos_12_meses": 1.5},
        {"queixa_principal": "A", "quedas_ultimos_12_meses": "1"},
        {"queixa_principal": "A", "observacoes_sintomas": "x" * 2001},
        {"queixa_principal": "A", "ultima_menstruacao": "2026-18-33"},
        {"queixa_principal": "A", "campo_extra": "x"},
        {"queixa_principal": "A", "dor_atual": 11},
        {},
    ],
)
def test_climaterio_rejeita_entrada_invalida(dados):
    with pytest.raises(ValidationError):
        create(dados)


def test_resposta_versionada_nao_perde_os_campos():
    item = create(
        {
            "queixa_principal": "Avaliação",
            "quedas_ultimos_12_meses": 0,
            "sintomas": ["sintomas_urinarios"],
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
            "modulo": "climaterio",
            "tipo": "avaliacao_inicial",
            "schema_versao": 2,
            "dados": item.dados.model_dump(mode="json"),
            "status": "registrada",
            "created_at": datetime(2026, 11, 24),
        }
    )
    assert response.dados["quedas_ultimos_12_meses"] == 0
    assert response.dados["sintomas"] == ["sintomas_urinarios"]
    assert response.dados["terapia_hormonal_informada"] is None
