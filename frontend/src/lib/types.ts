export type Role = "admin" | "fisioterapeuta" | "recepcao";
export interface User {
  id: number;
  nome: string;
  email: string;
  cargo: Role;
  clinica_id: number;
  ativo: boolean;
  crefito: string | null;
  whatsapp?: string | null;
}
export interface Patient {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  clinica_id: number;
  created_at: string;
}
export type PatientInput = Pick<
  Patient,
  "nome" | "cpf" | "telefone" | "data_nascimento"
>;
export interface Consultation {
  id: number;
  paciente_id: number;
  medico_id: number;
  queixa_principal: string;
  diagnostico: string | null;
  prescricao: string | null;
  observacoes: string | null;
  dor_atual: number | null;
  percepcao_paciente: "melhorou" | "igual" | "piorou" | null;
  created_at: string;
}
export type ConsultationInput = Omit<
  Consultation,
  "id" | "medico_id" | "created_at"
>;

export interface UserInput {
  nome: string; email: string; whatsapp: string; senha: string;
  cargo: "fisioterapeuta" | "recepcao"; crefito: string | null;
}
export interface Registration {
  clinica: {nome: string; cnpj: string};
  responsavel: Omit<UserInput, "cargo">;
}
export type AppointmentStatus = "agendado" | "realizado" | "cancelado";
export interface AppointmentInput {
  paciente_id: number; profissional_id: number; data_hora: string;
  duracao_minutos: number; observacoes: string | null;
}
export interface Appointment extends AppointmentInput {
  id: number; clinica_id: number; status: AppointmentStatus; created_at: string;
}

// Formato consumido pelo dashboard legado quando a rota está disponível.
export interface ClinicalFollowUp {
  paciente_id?: number;
  paciente_nome: string;
  percepcao_paciente: "melhorou" | "igual" | "piorou" | null;
  dor_anterior: number | null;
  dor_atual: number | null;
  sessoes_sem_melhora: number;
}

// Contrato da fundação clínica (versão 1). Nenhuma escala especializada nesta fase.
export type ClinicalModuleSlug = "pelvica" | "gestacao_posparto" | "reabilitacao" | "climaterio";
export type AssessmentKind = "avaliacao_inicial" | "reavaliacao" | "evolucao";
export interface ModuleAssessmentCount { modulo: ClinicalModuleSlug; total: number; }
export interface ClinicalAssessmentData {
  queixa_principal: string | null;
  dor_atual: number | null;
  percepcao_paciente: "melhorou" | "igual" | "piorou" | null;
  observacoes: string | null;
  plano: string | null;
}
export interface ClinicalAssessment {
  id: number;
  clinica_id: number;
  paciente_id: number;
  profissional_id: number;
  consulta_id: number | null;
  agendamento_id: number | null;
  modulo: ClinicalModuleSlug;
  tipo: AssessmentKind;
  schema_versao: 1 | 2;
  dados: ClinicalAssessmentData | PelvicAssessmentV2Data | GestationPostpartumV2Data | RehabilitationV2Data | ClimactericV2Data;
  status: "registrada";
  created_at: string;
}
export interface ClinicalAssessmentInput {
  modulo: ClinicalModuleSlug;
  tipo: AssessmentKind;
  schema_versao: 1 | 2;
  consulta_id?: number | null;
  agendamento_id?: number | null;
  dados: Partial<ClinicalAssessmentData> | PelvicAssessmentV2Data | GestationPostpartumV2Data | RehabilitationV2Data | ClimactericV2Data;
}

export type PelvicSymptom =
  | "incontinencia_esforco" | "incontinencia_urgencia" | "urgencia" | "nocturia"
  | "dor_pelvica" | "dispareunia" | "constipacao" | "prolapso";
export interface PelvicDiarySummary {
  data_inicio: string | null;
  data_fim: string | null;
  ingestao_media_ml: number | null;
  miccoes_por_dia: number | null;
  nocturia_por_noite: number | null;
  perdas_por_dia: number | null;
  episodios_urgencia_por_dia: number | null;
  situacoes_perdas: string | null;
  observacoes: string | null;
}
export interface PelvicAssessmentV2Data extends ClinicalAssessmentData {
  sintomas: PelvicSymptom[] | null;
  gestacoes: number | null;
  partos: number | null;
  cirurgias_pelvicas: string | null;
  medicamentos_relevantes: string | null;
  forca_oxford: number | null;
  avaliacao_assoalho_pelvico: string | null;
  iciq_sf: {
    frequencia: number;
    quantidade: 0 | 2 | 4 | 6;
    interferencia: number;
    pontuacao_total?: number | null;
  } | null;
  diario_miccional: PelvicDiarySummary | null;
}


export type PregnancyComplaint = "lombalgia" | "dor_pelvica" | "incontinencia" | "edema" | "outra";
export interface GestationPostpartumV2Data extends ClinicalAssessmentData {
  fase: "gestacao" | "posparto";
  gestacao: {
    data_avaliacao: string | null; dum: string | null; dpp_informada: string | null;
    gestacoes: number | null; partos: number | null; abortos: number | null;
    queixas: PregnancyComplaint[] | null;
    intercorrencias_relatadas: string | null; restricoes_medicas_informadas: string | null;
    idade_gestacional_dias?: number | null;
  } | null;
  posparto: {
    data_parto: string | null; via_parto: "vaginal" | "cesarea" | "outra" | null;
    lacracoes_relatadas: string | null; cicatriz_observacoes: string | null;
    diastase_cm: number | null; amamentacao: boolean | null;
    retorno_atividade_fisica: "nao" | "parcial" | "sim" | null;
    queixas_relatadas: string | null; sinais_alerta_relatados: string | null;
  } | null;
}


export type RehabilitationRegion = "cervical" | "ombro" | "cotovelo" | "punho_mao" | "coluna" | "quadril" | "joelho" | "tornozelo_pe" | "outra";
export interface RehabilitationMeasureV2 {
  regiao: RehabilitationRegion;
  movimento: string | null;
  amplitude_graus: number | null;
  forca_manual: number | null;
  observacoes: string | null;
}
export interface RehabilitationExerciseV2 {
  nome: string;
  series: number | null;
  repeticoes: number | null;
  observacoes: string | null;
}
export interface RehabilitationV2Data extends ClinicalAssessmentData {
  diagnostico_informado: string | null;
  lesao_cirurgia_relatada: string | null;
  data_lesao_cirurgia: string | null;
  limitacoes_funcionais: string | null;
  objetivos_paciente: string | null;
  medidas: RehabilitationMeasureV2[] | null;
  testes_funcionais: string | null;
  exercicios: RehabilitationExerciseV2[] | null;
  evolucao_sessao: string | null;
  meta_autonomia: string | null;
  criterios_alta: string | null;
}


/** Valores informados pela paciente/profissional; nenhum diagnóstico automático. */
export type ClimactericStage = "pre" | "peri" | "pos";
export type ClimactericSymptom = "fogachos" | "sudorese_noturna" | "ressecamento_vaginal"
  | "sintomas_urinarios" | "dor_musculoesqueletica" | "alteracao_sono"
  | "alteracao_humor" | "outro";
export interface ClimactericV2Data extends ClinicalAssessmentData {
  estagio_informado: ClimactericStage | null;
  ultima_menstruacao: string | null;
  terapia_hormonal_informada: "sim" | "nao" | "nao_sabe" | null;
  sintomas: ClimactericSymptom[] | null;
  observacoes_sintomas: string | null;
  sexualidade_relatada: string | null;
  qualidade_vida_relatada: string | null;
  saude_ossea_informada: string | null;
  quedas_ultimos_12_meses: number | null;
  sono_relatado: string | null;
  humor_relatado: string | null;
  avaliacao_funcional: string | null;
}
