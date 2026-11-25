import { useState } from "react";
import type { FormEvent } from "react";
import type { AssessmentKind, ClinicalAssessmentInput, RehabilitationRegion, RehabilitationV2Data, RehabilitationMeasureV2, RehabilitationExerciseV2 } from "../../lib/types";
import "./PelvicAssessment.css";

export const rehabilitationRegions: { value: RehabilitationRegion; label: string }[] = [
  { value: "cervical", label: "Cervical" }, { value: "ombro", label: "Ombro" },
  { value: "cotovelo", label: "Cotovelo" }, { value: "punho_mao", label: "Punho / mão" },
  { value: "coluna", label: "Coluna" }, { value: "quadril", label: "Quadril" },
  { value: "joelho", label: "Joelho" }, { value: "tornozelo_pe", label: "Tornozelo / pé" },
  { value: "outra", label: "Outra região" },
];
export const rehabilitationRegionNames = Object.fromEntries(rehabilitationRegions.map(x => [x.value, x.label])) as Record<RehabilitationRegion, string>;

export function RehabilitationForm({ onSave, saving }: {
  onSave: (data: ClinicalAssessmentInput) => Promise<void>;
  saving: boolean;
}) {
  const [measureRows, setMeasureRows] = useState<number[]>([]);
  const [exerciseRows, setExerciseRows] = useState<number[]>([]);
  const [nextId, setNextId] = useState(1);
  const [error, setError] = useState("");

  function addMeasure() {
    if (measureRows.length >= 12) return;
    setMeasureRows(rows => [...rows, nextId]); setNextId(n => n + 1);
  }
  function addExercise() {
    if (exerciseRows.length >= 20) return;
    setExerciseRows(rows => [...rows, nextId]); setNextId(n => n + 1);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (field: string) => String(form.get(field) ?? "").trim();
    const optional = (field: string) => get(field) || null;
    const numeric = (field: string) => get(field) === "" ? null : Number(get(field));
    setError("");
    const medidas: RehabilitationMeasureV2[] = measureRows.map(id => ({
      regiao: get(`regiao_${id}`) as RehabilitationRegion,
      movimento: optional(`movimento_${id}`),
      amplitude_graus: numeric(`amplitude_${id}`),
      forca_manual: numeric(`forca_${id}`),
      observacoes: optional(`medida_obs_${id}`),
    }));
    if (medidas.some(m => m.amplitude_graus === null && m.forca_manual === null)) {
      setError("Preencha amplitude ou força em cada medida funcional, ou remova a linha."); return;
    }
    const exercicios: RehabilitationExerciseV2[] = exerciseRows.map(id => ({
      nome: get(`exercicio_${id}`),
      series: numeric(`series_${id}`),
      repeticoes: numeric(`repeticoes_${id}`),
      observacoes: optional(`exercicio_obs_${id}`),
    }));
    if (exercicios.some(e => !e.nome)) { setError("Informe o nome de cada exercício, ou remova a linha."); return; }
    const dados: RehabilitationV2Data = {
      queixa_principal: optional("queixa_principal"), dor_atual: numeric("dor_atual"),
      percepcao_paciente: optional("percepcao_paciente") as RehabilitationV2Data["percepcao_paciente"],
      observacoes: optional("observacoes"), plano: optional("plano"),
      diagnostico_informado: optional("diagnostico_informado"),
      lesao_cirurgia_relatada: optional("lesao_cirurgia_relatada"),
      data_lesao_cirurgia: optional("data_lesao_cirurgia"),
      limitacoes_funcionais: optional("limitacoes_funcionais"),
      objetivos_paciente: optional("objetivos_paciente"),
      medidas: medidas.length ? medidas : null,
      testes_funcionais: optional("testes_funcionais"),
      exercicios: exercicios.length ? exercicios : null,
      evolucao_sessao: optional("evolucao_sessao"),
      meta_autonomia: optional("meta_autonomia"), criterios_alta: optional("criterios_alta"),
    };
    try {
      await onSave({ modulo: "reabilitacao", tipo: get("tipo") as AssessmentKind, schema_versao: 2, dados });
    } catch (err) { setError((err as Error).message); }
  }

  return <form className="form-stack pelvic-form" onSubmit={e => void submit(e)}>
    <h3>Nova avaliação — Reabilitação</h3>
    <p className="muted">Registro realizado pelo fisioterapeuta. Medidas e testes não geram diagnóstico nem conduta automática.</p>
    <label>Tipo de registro<select name="tipo" defaultValue="avaliacao_inicial" required>
      <option value="avaliacao_inicial">Avaliação inicial</option><option value="reavaliacao">Reavaliação</option><option value="evolucao">Evolução</option>
    </select></label>
    <label>Queixa principal<textarea name="queixa_principal" required minLength={1} maxLength={2000} rows={2}/></label>
    <div className="form-grid">
      <label>Dor atual (0–10)<input name="dor_atual" type="number" min="0" max="10" step="1" /></label>
      <label>Percepção da paciente<select name="percepcao_paciente" defaultValue="">
        <option value="">Não informada</option><option value="melhorou">Melhorou</option><option value="igual">Igual</option><option value="piorou">Piorou</option>
      </select></label>
    </div>
    <label>Diagnóstico clínico/funcional informado<textarea name="diagnostico_informado" rows={2} maxLength={2000}/></label>
    <div className="form-grid">
      <label>Lesão ou cirurgia relatada<textarea name="lesao_cirurgia_relatada" rows={2} maxLength={2000}/></label>
      <label>Data da lesão/cirurgia (se informada)<input name="data_lesao_cirurgia" type="date" /></label>
    </div>
    <label>Limitações funcionais<textarea name="limitacoes_funcionais" rows={2} maxLength={2000}/></label>
    <label>Objetivos funcionais relatados pela paciente<textarea name="objetivos_paciente" rows={2} maxLength={2000}/></label>
    <fieldset className="pelvic-fieldset">
      <legend>Medidas funcionais por região <small>[validar métodos de avaliação]</small></legend>
      {measureRows.map((id, i) => <div key={id} className="panel" style={{ marginBottom: 12 }}>
        <div className="section-heading"><h4>Medida {i + 1}</h4><button type="button" className="secondary" onClick={() => setMeasureRows(v => v.filter(k => k !== id))}>Remover</button></div>
        <div className="form-grid">
          <label>Região<select name={`regiao_${id}`} defaultValue="ombro" required>{rehabilitationRegions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
          <label>Movimento / teste<input name={`movimento_${id}`} maxLength={120} placeholder="Ex.: flexão" /></label>
          <label>Amplitude (graus)<input name={`amplitude_${id}`} type="number" min="-360" max="360" step="any" /></label>
          <label>Força manual (0–5)<input name={`forca_${id}`} type="number" min="0" max="5" step="1" /></label>
        </div>
        <label>Observações<input name={`medida_obs_${id}`} maxLength={500} /></label>
      </div>)}
      <button type="button" className="secondary" disabled={measureRows.length >= 12} onClick={addMeasure}>Adicionar medida</button>
    </fieldset>
    <label>Testes funcionais realizados <small>[indicar método e resultado informado]</small><textarea name="testes_funcionais" rows={2} maxLength={2000}/></label>
    <fieldset className="pelvic-fieldset">
      <legend>Exercícios prescritos / registrados</legend>
      {exerciseRows.map((id, i) => <div key={id} className="panel" style={{ marginBottom: 12 }}>
        <div className="section-heading"><h4>Exercício {i + 1}</h4><button type="button" className="secondary" onClick={() => setExerciseRows(v => v.filter(k => k !== id))}>Remover</button></div>
        <label>Nome do exercício<input name={`exercicio_${id}`} required maxLength={150} /></label>
        <div className="form-grid">
          <label>Séries<input name={`series_${id}`} type="number" min="1" max="30" step="1" /></label>
          <label>Repetições<input name={`repeticoes_${id}`} type="number" min="1" max="300" step="1" /></label>
        </div>
        <label>Observações<input name={`exercicio_obs_${id}`} maxLength={500} /></label>
      </div>)}
      <button type="button" className="secondary" disabled={exerciseRows.length >= 20} onClick={addExercise}>Adicionar exercício</button>
    </fieldset>
    <label>Evolução observada nesta sessão<textarea name="evolucao_sessao" rows={3} maxLength={4000}/></label>
    <label>Meta de autonomia<textarea name="meta_autonomia" rows={2} maxLength={2000}/></label>
    <label>Critérios de alta previstos<textarea name="criterios_alta" rows={2} maxLength={2000}/></label>
    <label>Observações gerais<textarea name="observacoes" rows={2} maxLength={4000}/></label>
    <label>Plano de tratamento<textarea name="plano" rows={3} maxLength={4000}/></label>
    {error && <p role="alert" className="error">{error}</p>}
    <button className="primary" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar avaliação de reabilitação"}</button>
  </form>;
}
