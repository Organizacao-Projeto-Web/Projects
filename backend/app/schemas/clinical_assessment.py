"""Contrato V1 comum; os campos especializados serão validados por versão.

Fase 1: apenas dados comuns. Nenhum JSON arbitrário é aceito.
"""
from datetime import date, datetime
from typing import Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator

ModuloClinico = Literal["pelvica", "gestacao_posparto", "reabilitacao", "climaterio"]
TipoAvaliacao = Literal["avaliacao_inicial", "reavaliacao", "evolucao"]
PercepcaoPaciente = Literal["melhorou", "igual", "piorou"]


class DadosComunsV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queixa_principal: str | None = Field(default=None, min_length=1, max_length=2000)
    dor_atual: int | None = Field(default=None, strict=True, ge=0, le=10)
    percepcao_paciente: PercepcaoPaciente | None = None
    observacoes: str | None = Field(default=None, min_length=1, max_length=4000)
    plano: str | None = Field(default=None, min_length=1, max_length=4000)

    @model_validator(mode="after")
    def exigir_algum_dado(self):
        if not any(valor is not None for valor in self.model_dump().values()):
            raise ValueError("Informe ao menos um dado clínico.")
        return self


class DadosPelvicaV1(DadosComunsV1):
    pass


SintomaPelvico = Literal[
    "incontinencia_esforco", "incontinencia_urgencia", "urgencia", "nocturia",
    "dor_pelvica", "dispareunia", "constipacao", "prolapso",
]


class ICIQSFV2(BaseModel):
    """Registro numérico: conferir aplicação do instrumento com responsável clínico."""
    model_config = ConfigDict(extra="forbid")

    frequencia: int = Field(strict=True, ge=0, le=5)
    quantidade: Literal[0, 2, 4, 6]
    interferencia: int = Field(strict=True, ge=0, le=10)
    pontuacao_total: int | None = Field(default=None, strict=True, ge=0, le=21)

    @model_validator(mode="after")
    def calcular_pontuacao(self):
        # Total informativo; nunca usado para diagnóstico automático.
        self.pontuacao_total = self.frequencia + self.quantidade + self.interferencia
        return self


class ResumoDiarioMiccionalV2(BaseModel):
    """Resumo transcrito pelo fisioterapeuta, não eventos individuais."""
    model_config = ConfigDict(extra="forbid")

    data_inicio: date | None = None
    data_fim: date | None = None
    ingestao_media_ml: int | None = Field(default=None, strict=True, ge=0, le=20000)
    miccoes_por_dia: float | None = Field(default=None, ge=0, le=50)
    nocturia_por_noite: float | None = Field(default=None, ge=0, le=30)
    perdas_por_dia: float | None = Field(default=None, ge=0, le=50)
    episodios_urgencia_por_dia: float | None = Field(default=None, ge=0, le=50)
    situacoes_perdas: str | None = Field(default=None, min_length=1, max_length=1000)
    observacoes: str | None = Field(default=None, min_length=1, max_length=2000)

    @model_validator(mode="after")
    def validar_periodo(self):
        if self.data_inicio is not None and self.data_fim is not None and self.data_fim < self.data_inicio:
            raise ValueError("A data final do diário deve ser igual ou posterior à inicial.")
        return self


class DadosPelvicaV2(DadosComunsV1):
    sintomas: list[SintomaPelvico] | None = Field(default=None, max_length=8)
    gestacoes: int | None = Field(default=None, strict=True, ge=0, le=30)
    partos: int | None = Field(default=None, strict=True, ge=0, le=30)
    cirurgias_pelvicas: str | None = Field(default=None, min_length=1, max_length=2000)
    medicamentos_relevantes: str | None = Field(default=None, min_length=1, max_length=2000)
    forca_oxford: int | None = Field(default=None, strict=True, ge=0, le=5)
    avaliacao_assoalho_pelvico: str | None = Field(default=None, min_length=1, max_length=2000)
    iciq_sf: ICIQSFV2 | None = None
    diario_miccional: ResumoDiarioMiccionalV2 | None = None

    @model_validator(mode="after")
    def validar_gestacoes(self):
        if self.gestacoes is not None and self.partos is not None and self.partos > self.gestacoes:
            raise ValueError("O número de partos não pode superar o de gestações informadas.")
        return self


class DadosGestacaoPospartoV1(DadosComunsV1):
    pass




# Ficha especializada de gestação e pós-parto, versão 2.
# Conteúdo clínico preliminar: validar com profissional responsável.
QueixaGestacional = Literal["lombalgia", "dor_pelvica", "incontinencia", "edema", "outra"]
ViaParto = Literal["vaginal", "cesarea", "outra"]


class GestacaoDadosV2(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data_avaliacao: date | None = None
    dum: date | None = None
    dpp_informada: date | None = None
    gestacoes: int | None = Field(default=None, strict=True, ge=0, le=30)
    partos: int | None = Field(default=None, strict=True, ge=0, le=30)
    abortos: int | None = Field(default=None, strict=True, ge=0, le=30)
    queixas: list[QueixaGestacional] | None = Field(default=None, max_length=5)
    intercorrencias_relatadas: str | None = Field(default=None, min_length=1, max_length=2000)
    restricoes_medicas_informadas: str | None = Field(default=None, min_length=1, max_length=2000)
    idade_gestacional_dias: int | None = Field(default=None, strict=True, ge=0)

    @model_validator(mode="after")
    def validar_dados(self):
        if self.gestacoes is not None and self.partos is not None and self.partos > self.gestacoes:
            raise ValueError("Número de partos não pode superar o de gestações.")
        # IG é informativa, referida à data da avaliação e calculada apenas com DUM informada.
        if self.dum is not None and self.data_avaliacao is not None:
            dias = (self.data_avaliacao - self.dum).days
            if dias < 0:
                raise ValueError("Data da avaliação não pode ser anterior à DUM.")
            self.idade_gestacional_dias = dias
        else:
            self.idade_gestacional_dias = None
        return self


class PospartoDadosV2(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data_parto: date | None = None
    via_parto: ViaParto | None = None
    lacracoes_relatadas: str | None = Field(default=None, min_length=1, max_length=1000)
    cicatriz_observacoes: str | None = Field(default=None, min_length=1, max_length=2000)
    diastase_cm: float | None = Field(default=None, ge=0, le=30)
    amamentacao: bool | None = None
    retorno_atividade_fisica: Literal["nao", "parcial", "sim"] | None = None
    queixas_relatadas: str | None = Field(default=None, min_length=1, max_length=2000)
    sinais_alerta_relatados: str | None = Field(default=None, min_length=1, max_length=2000)


class DadosGestacaoPospartoV2(DadosComunsV1):
    fase: Literal["gestacao", "posparto"]
    gestacao: GestacaoDadosV2 | None = None
    posparto: PospartoDadosV2 | None = None

    @model_validator(mode="after")
    def conferir_fase(self):
        if self.fase == "gestacao" and (self.gestacao is None or self.posparto is not None):
            raise ValueError("Preencha apenas a seção de gestação.")
        if self.fase == "posparto" and (self.posparto is None or self.gestacao is not None):
            raise ValueError("Preencha apenas a seção de pós-parto.")
        return self


class DadosReabilitacaoV1(DadosComunsV1):
    pass




# Ficha de Reabilitação, versão 2. Medidas relatadas pelo profissional.
# Limites e protocolos funcionais: validar com o responsável técnico.
RegiaoFuncional = Literal[
    "cervical", "ombro", "cotovelo", "punho_mao", "coluna",
    "quadril", "joelho", "tornozelo_pe", "outra",
]


class MedidaFuncionalV2(BaseModel):
    model_config = ConfigDict(extra="forbid")

    regiao: RegiaoFuncional
    movimento: str | None = Field(default=None, min_length=1, max_length=120)
    amplitude_graus: float | None = Field(default=None, ge=-360, le=360)
    forca_manual: int | None = Field(default=None, strict=True, ge=0, le=5)
    observacoes: str | None = Field(default=None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def exigir_valor(self):
        if self.amplitude_graus is None and self.forca_manual is None:
            raise ValueError("Informe amplitude ou força para cada medida funcional.")
        return self


class ExercicioReabilitacaoV2(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str = Field(min_length=1, max_length=150)
    series: int | None = Field(default=None, strict=True, ge=1, le=30)
    repeticoes: int | None = Field(default=None, strict=True, ge=1, le=300)
    observacoes: str | None = Field(default=None, min_length=1, max_length=500)


class DadosReabilitacaoV2(DadosComunsV1):
    diagnostico_informado: str | None = Field(default=None, min_length=1, max_length=2000)
    lesao_cirurgia_relatada: str | None = Field(default=None, min_length=1, max_length=2000)
    data_lesao_cirurgia: date | None = None
    limitacoes_funcionais: str | None = Field(default=None, min_length=1, max_length=2000)
    objetivos_paciente: str | None = Field(default=None, min_length=1, max_length=2000)
    medidas: list[MedidaFuncionalV2] | None = Field(default=None, max_length=12)
    testes_funcionais: str | None = Field(default=None, min_length=1, max_length=2000)
    exercicios: list[ExercicioReabilitacaoV2] | None = Field(default=None, max_length=20)
    evolucao_sessao: str | None = Field(default=None, min_length=1, max_length=4000)
    meta_autonomia: str | None = Field(default=None, min_length=1, max_length=2000)
    criterios_alta: str | None = Field(default=None, min_length=1, max_length=2000)


class DadosClimaterioV1(DadosComunsV1):
    pass


# Proposta de ficha especializada de Climatério e Menopausa, versão 2.
# Estágio e informações hormonais são RELATADOS, não diagnosticados pelo sistema.
EstagioClimaterio = Literal["pre", "peri", "pos"]
SintomaClimaterio = Literal[
    "fogachos", "sudorese_noturna", "ressecamento_vaginal",
    "sintomas_urinarios", "dor_musculoesqueletica", "alteracao_sono",
    "alteracao_humor", "outro",
]
TerapiaHormonalInformada = Literal["sim", "nao", "nao_sabe"]


class DadosClimaterioV2(DadosComunsV1):
    estagio_informado: EstagioClimaterio | None = None
    ultima_menstruacao: date | None = None
    terapia_hormonal_informada: TerapiaHormonalInformada | None = None
    sintomas: list[SintomaClimaterio] | None = Field(default=None, max_length=8)
    observacoes_sintomas: str | None = Field(default=None, min_length=1, max_length=2000)
    sexualidade_relatada: str | None = Field(default=None, min_length=1, max_length=2000)
    qualidade_vida_relatada: str | None = Field(default=None, min_length=1, max_length=2000)
    saude_ossea_informada: str | None = Field(default=None, min_length=1, max_length=2000)
    quedas_ultimos_12_meses: int | None = Field(default=None, strict=True, ge=0, le=100)
    sono_relatado: str | None = Field(default=None, min_length=1, max_length=2000)
    humor_relatado: str | None = Field(default=None, min_length=1, max_length=2000)
    avaliacao_funcional: str | None = Field(default=None, min_length=1, max_length=2000)

    @model_validator(mode="after")
    def evitar_sintomas_duplicados(self):
        if self.sintomas is not None and len(set(self.sintomas)) != len(self.sintomas):
            raise ValueError("Um mesmo sintoma não pode ser repetido.")
        return self


class AvaliacaoCreateBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: TipoAvaliacao
    schema_versao: Literal[1] = 1
    consulta_id: int | None = Field(default=None, gt=0)
    agendamento_id: int | None = Field(default=None, gt=0)


class AvaliacaoPelvicaCreate(AvaliacaoCreateBase):
    modulo: Literal["pelvica"]
    dados: DadosPelvicaV1


class AvaliacaoPelvicaCreateV2(AvaliacaoCreateBase):
    modulo: Literal["pelvica"]
    schema_versao: Literal[2]
    dados: DadosPelvicaV2


class AvaliacaoGestacaoPospartoCreate(AvaliacaoCreateBase):
    modulo: Literal["gestacao_posparto"]
    dados: DadosGestacaoPospartoV1


class AvaliacaoGestacaoPospartoCreateV2(AvaliacaoCreateBase):
    modulo: Literal["gestacao_posparto"]
    schema_versao: Literal[2]
    dados: DadosGestacaoPospartoV2


class AvaliacaoReabilitacaoCreate(AvaliacaoCreateBase):
    modulo: Literal["reabilitacao"]
    dados: DadosReabilitacaoV1


class AvaliacaoReabilitacaoCreateV2(AvaliacaoCreateBase):
    modulo: Literal["reabilitacao"]
    schema_versao: Literal[2]
    dados: DadosReabilitacaoV2


class AvaliacaoClimaterioCreate(AvaliacaoCreateBase):
    modulo: Literal["climaterio"]
    dados: DadosClimaterioV1


class AvaliacaoClimaterioCreateV2(AvaliacaoCreateBase):
    modulo: Literal["climaterio"]
    schema_versao: Literal[2]
    dados: DadosClimaterioV2


# As versões coexistem: os registros V1 nunca são convertidos silenciosamente.
AvaliacaoCreate = Union[
    AvaliacaoPelvicaCreateV2,
    AvaliacaoPelvicaCreate,
    AvaliacaoGestacaoPospartoCreateV2,
    AvaliacaoGestacaoPospartoCreate,
    AvaliacaoReabilitacaoCreateV2,
    AvaliacaoReabilitacaoCreate,
    AvaliacaoClimaterioCreateV2,
    AvaliacaoClimaterioCreate,
]


class AvaliacaoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinica_id: int
    paciente_id: int
    profissional_id: int
    consulta_id: int | None
    agendamento_id: int | None
    modulo: ModuloClinico
    tipo: TipoAvaliacao
    schema_versao: Literal[1, 2]
    dados: dict[str, Any]
    status: Literal["registrada"]
    created_at: datetime

    @model_validator(mode="after")
    def validar_versao_e_dados(self):
        if self.modulo == "pelvica" and self.schema_versao == 2:
            schema = DadosPelvicaV2
        elif self.modulo == "gestacao_posparto" and self.schema_versao == 2:
            schema = DadosGestacaoPospartoV2
        elif self.modulo == "reabilitacao" and self.schema_versao == 2:
            schema = DadosReabilitacaoV2
        elif self.modulo == "climaterio" and self.schema_versao == 2:
            schema = DadosClimaterioV2
        elif self.schema_versao == 1:
            schema = DadosComunsV1
        else:
            raise ValueError("Versão de avaliação clínica não suportada.")
        self.dados = schema.model_validate(self.dados).model_dump(mode="json", by_alias=True)
        return self
