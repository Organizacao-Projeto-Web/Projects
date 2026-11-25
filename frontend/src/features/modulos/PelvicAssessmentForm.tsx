import "./PelvicAssessment.css";
import { useState } from "react";
import type { FormEvent } from "react";
import type { AssessmentKind, ClinicalAssessmentInput, PelvicAssessmentV2Data, PelvicSymptom } from "../../lib/types";

const symptoms: { id: PelvicSymptom; label: string }[] = [
  { id: "incontinencia_esforco", label: "Perda ao esforço" },
  { id: "incontinencia_urgencia", label: "Perda associada à urgência" },
  { id: "urgencia", label: "Urgência urinária" },
  { id: "nocturia", label: "Noctúria" },
  { id: "dor_pelvica", label: "Dor pélvica" },
  { id: "dispareunia", label: "Dor durante relação sexual" },
  { id: "constipacao", label: "Constipação" },
  { id: "prolapso", label: "Queixa de prolapso" },
];
export const symptomNames = Object.fromEntries(symptoms.map(({id,label}) => [id,label])) as Record<PelvicSymptom,string>;

export function PelvicAssessmentForm({ onSave, saving }: {
  onSave: (data: ClinicalAssessmentInput) => Promise<void>;
  saving: boolean;
}) {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const optional = (key: string) => text(key) || null;
    const numeric = (key: string) => text(key) === "" ? null : Number(text(key));
    const selectedSymptoms = form.getAll("sintomas") as PelvicSymptom[];
    const icfq = numeric("iciq_frequencia");
    const icam = numeric("iciq_quantidade");
    const icim = numeric("iciq_interferencia");
    const iciqSome = [icfq, icam, icim].some(v => v !== null);
    const iciqFull = [icfq, icam, icim].every(v => v !== null);
    setError("");
    if (iciqSome && !iciqFull) {
      setError("Informe os três itens numéricos do ICIQ-SF ou deixe todos em branco.");
      return;
    }
    const diary = {
      data_inicio: optional("diario_inicio"),
      data_fim: optional("diario_fim"),
      ingestao_media_ml: numeric("ingestao_media_ml"),
      miccoes_por_dia: numeric("miccoes_por_dia"),
      nocturia_por_noite: numeric("nocturia_por_noite"),
      perdas_por_dia: numeric("perdas_por_dia"),
      episodios_urgencia_por_dia: numeric("episodios_urgencia_por_dia"),
      situacoes_perdas: optional("situacoes_perdas"),
      observacoes: optional("diario_observacoes"),
    };
    if (diary.data_inicio && diary.data_fim && diary.data_fim < diary.data_inicio) {
      setError("A data final do diário não pode ser anterior à inicial.");
      return;
    }
    const hasDiary = Object.values(diary).some(v => v !== null);
    const details: PelvicAssessmentV2Data = {
      queixa_principal: optional("queixa_principal"),
      dor_atual: numeric("dor_atual"),
      percepcao_paciente: text("percepcao_paciente") as PelvicAssessmentV2Data["percepcao_paciente"] || null,
      observacoes: optional("observacoes"),
      plano: optional("plano"),
      sintomas: selectedSymptoms.length ? selectedSymptoms : null,
      gestacoes: numeric("gestacoes"),
      partos: numeric("partos"),
      cirurgias_pelvicas: optional("cirurgias_pelvicas"),
      medicamentos_relevantes: optional("medicamentos_relevantes"),
      forca_oxford: numeric("forca_oxford"),
      avaliacao_assoalho_pelvico: optional("avaliacao_assoalho_pelvico"),
      iciq_sf: iciqFull ? {
        frequencia: icfq as number, quantidade: icam as 0 | 2 | 4 | 6,
        interferencia: icim as number,
      } : null,
      diario_miccional: hasDiary ? diary : null,
    };
    if (details.gestacoes !== null && details.partos !== null && details.partos > details.gestacoes) {
      setError("O número de partos não pode superar o de gestações.");
      return;
    }
    try {
      await onSave({
        modulo: "pelvica", tipo: text("tipo") as AssessmentKind,
        schema_versao: 2, dados: details,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return <form className="form-stack pelvic-form" onSubmit={(e) => void submit(e)}>
    <h3>Nova avaliação — Fisioterapia Pélvica</h3>
    <p className="muted">Campos clínicos preenchidos pelo profissional. Escalas e limites devem ser validados pela equipe responsável.</p>
    <label>Tipo de registro
      <select name="tipo" defaultValue="avaliacao_inicial" required>
        <option value="avaliacao_inicial">Avaliação inicial</option>
        <option value="reavaliacao">Reavaliação</option>
        <option value="evolucao">Evolução</option>
      </select>
    </label>
    <label>Queixa principal
      <textarea name="queixa_principal" required minLength={1} maxLength={2000} rows={3} />
    </label>
    <div className="form-grid">
      <label>Dor atual (0–10)
        <input name="dor_atual" type="number" min="0" max="10" step="1" />
      </label>
      <label>Percepção da paciente
        <select name="percepcao_paciente" defaultValue="">
          <option value="">Não informada</option>
          <option value="melhorou">Melhorou</option>
          <option value="igual">Permaneceu igual</option>
          <option value="piorou">Piorou</option>
        </select>
      </label>
    </div>
    <fieldset className="pelvic-fieldset">
      <legend>Sintomas relatados</legend>
      <div className="pelvic-checkboxes">{symptoms.map(({id,label}) => <label key={id}><input type="checkbox" name="sintomas" value={id} /> {label}</label>)}</div>
    </fieldset>
    <div className="form-grid">
      <label>Gestações (quantidade)<input name="gestacoes" type="number" step="1" min="0" max="30" /></label>
      <label>Partos (quantidade)<input name="partos" type="number" step="1" min="0" max="30" /></label>
    </div>
    <label>Cirurgias pélvicas relatadas<textarea name="cirurgias_pelvicas" maxLength={2000} rows={2} /></label>
    <label>Medicações relevantes relatadas<textarea name="medicamentos_relevantes" maxLength={2000} rows={2} /></label>
    <div className="form-grid">
      <label>Força do assoalho pélvico — Oxford (0–5) <small>[validar escala]</small>
        <input name="forca_oxford" type="number" min="0" max="5" step="1" />
      </label>
      <label>Avaliação funcional do assoalho pélvico
        <textarea name="avaliacao_assoalho_pelvico" maxLength={2000} rows={2} />
      </label>
    </div>
    <fieldset className="pelvic-fieldset">
      <legend>ICIQ-SF — itens numéricos <small>[validar versão e aplicação]</small></legend>
      <p className="muted">Preencha somente valores obtidos do instrumento apropriado. O total é calculado pela API, sem diagnóstico automático.</p>
      <div className="form-grid">
        <label>Frequência (0–5)<input name="iciq_frequencia" type="number" min="0" max="5" step="1" /></label>
        <label>Quantidade (0, 2, 4 ou 6)<select name="iciq_quantidade" defaultValue=""><option value="">Não informado</option>{[0,2,4,6].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <label>Interferência (0–10)<input name="iciq_interferencia" type="number" min="0" max="10" step="1" /></label>
      </div>
    </fieldset>
    <fieldset className="pelvic-fieldset">
      <legend>Diário miccional — resumo registrado pelo profissional</legend>
      <p className="muted">A paciente preenche o diário fora do sistema. Registre aqui somente o resumo dos dados apresentados.</p>
      <div className="form-grid">
        <label>Data inicial<input name="diario_inicio" type="date" /></label>
        <label>Data final<input name="diario_fim" type="date" /></label>
        <label>Ingestão média (mL/dia)<input name="ingestao_media_ml" type="number" min="0" max="20000" step="1" /></label>
        <label>Micções por dia<input name="miccoes_por_dia" type="number" min="0" max="50" step="0.1" /></label>
        <label>Noctúria por noite<input name="nocturia_por_noite" type="number" min="0" max="30" step="0.1" /></label>
        <label>Perdas por dia<input name="perdas_por_dia" type="number" min="0" max="50" step="0.1" /></label>
        <label>Urgências por dia<input name="episodios_urgencia_por_dia" type="number" min="0" max="50" step="0.1" /></label>
      </div>
      <label>Situações das perdas<textarea name="situacoes_perdas" rows={2} maxLength={1000}/></label>
      <label>Observações do diário<textarea name="diario_observacoes" rows={2} maxLength={2000}/></label>
    </fieldset>
    <label>Observações clínicas<textarea name="observacoes" rows={3} maxLength={4000}/></label>
    <label>Plano / conduta registrada<textarea name="plano" rows={3} maxLength={4000}/></label>
    {error && <p role="alert" className="error">{error}</p>}
    <button type="submit" className="primary" disabled={saving}>{saving ? "Salvando…" : "Salvar avaliação pélvica"}</button>
  </form>;
}
