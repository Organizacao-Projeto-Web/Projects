import { useState } from "react";
import type { FormEvent } from "react";
import type { AssessmentKind, ClinicalAssessmentInput, GestationPostpartumV2Data, PregnancyComplaint } from "../../lib/types";
import "./PelvicAssessment.css";

const complaints: { value: PregnancyComplaint; label: string }[] = [
  { value: "lombalgia", label: "Lombalgia" }, { value: "dor_pelvica", label: "Dor pélvica" },
  { value: "incontinencia", label: "Incontinência urinária" }, { value: "edema", label: "Edema" },
  { value: "outra", label: "Outra queixa" },
];
export const gestationComplaintLabels = Object.fromEntries(complaints.map(x => [x.value, x.label])) as Record<PregnancyComplaint, string>;

export function GestationPostpartumForm({ onSave, saving }: {
  onSave: (value: ClinicalAssessmentInput) => Promise<void>; saving: boolean;
}) {
  const [fase, setFase] = useState<"gestacao" | "posparto">("gestacao");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const txt = (key: string) => String(data.get(key) ?? "").trim();
    const optional = (key: string) => txt(key) || null;
    const numberOrNull = (key: string) => txt(key) === "" ? null : Number(txt(key));
    const gestacao = fase === "gestacao" ? {
      data_avaliacao: optional("data_avaliacao"), dum: optional("dum"),
      dpp_informada: optional("dpp_informada"),
      gestacoes: numberOrNull("gestacoes"), partos: numberOrNull("partos"), abortos: numberOrNull("abortos"),
      queixas: (data.getAll("queixas") as PregnancyComplaint[]).length ? data.getAll("queixas") as PregnancyComplaint[] : null,
      intercorrencias_relatadas: optional("intercorrencias_relatadas"),
      restricoes_medicas_informadas: optional("restricoes_medicas_informadas"),
    } : null;
    const posparto = fase === "posparto" ? {
      data_parto: optional("data_parto"),
      via_parto: (optional("via_parto") as "vaginal" | "cesarea" | "outra" | null),
      lacracoes_relatadas: optional("lacracoes_relatadas"),
      cicatriz_observacoes: optional("cicatriz_observacoes"),
      diastase_cm: numberOrNull("diastase_cm"),
      amamentacao: txt("amamentacao") === "" ? null : txt("amamentacao") === "sim",
      retorno_atividade_fisica: optional("retorno_atividade_fisica") as "nao" | "parcial" | "sim" | null,
      queixas_relatadas: optional("queixas_relatadas"),
      sinais_alerta_relatados: optional("sinais_alerta_relatados"),
    } : null;
    setError("");
    if (gestacao?.dum && gestacao.data_avaliacao && gestacao.data_avaliacao < gestacao.dum) {
      setError("A data de avaliação não pode ser anterior à última menstruação informada."); return;
    }
    if (gestacao?.gestacoes !== null && gestacao?.partos !== null && gestacao?.gestacoes !== undefined && gestacao?.partos !== undefined && gestacao.partos > gestacao.gestacoes) {
      setError("O número de partos não pode superar o de gestações."); return;
    }
    const details: GestationPostpartumV2Data = {
      fase, gestacao, posparto,
      queixa_principal: optional("queixa_principal"), dor_atual: numberOrNull("dor_atual"),
      percepcao_paciente: optional("percepcao_paciente") as GestationPostpartumV2Data["percepcao_paciente"],
      observacoes: optional("observacoes"), plano: optional("plano"),
    };
    try {
      await onSave({ modulo: "gestacao_posparto", tipo: txt("tipo") as AssessmentKind, schema_versao: 2, dados: details });
    } catch (err) { setError((err as Error).message); }
  }

  return <form className="form-stack pelvic-form" onSubmit={event => void submit(event)}>
    <h3>Nova avaliação — Gestação e Pós-parto</h3>
    <p className="muted">Ficha preliminar sujeita à validação clínica. Não gera diagnóstico ou orientação automaticamente.</p>
    <label>Tipo de registro<select name="tipo" defaultValue="avaliacao_inicial" required>
      <option value="avaliacao_inicial">Avaliação inicial</option><option value="reavaliacao">Reavaliação</option><option value="evolucao">Evolução</option>
    </select></label>
    <label>Fase de cuidado<select value={fase} onChange={event => setFase(event.target.value as "gestacao" | "posparto")}>
      <option value="gestacao">Gestação</option><option value="posparto">Pós-parto</option>
    </select></label>
    <label>Queixa principal<textarea name="queixa_principal" required minLength={1} maxLength={2000} rows={2}/></label>
    <div className="form-grid">
      <label>Dor atual (0–10)<input name="dor_atual" type="number" min="0" max="10" step="1" /></label>
      <label>Percepção da paciente<select name="percepcao_paciente" defaultValue=""><option value="">Não informada</option><option value="melhorou">Melhorou</option><option value="igual">Igual</option><option value="piorou">Piorou</option></select></label>
    </div>
    {fase === "gestacao" ? <fieldset className="pelvic-fieldset"><legend>Dados da gestação</legend>
      <div className="form-grid">
        <label>Data desta avaliação<input name="data_avaliacao" type="date" /></label>
        <label>Data da última menstruação (DUM)<input name="dum" type="date" /></label>
        <label>Data provável do parto informada<input name="dpp_informada" type="date" /></label>
        <label>Gestações<input name="gestacoes" type="number" min="0" max="30" step="1"/></label>
        <label>Partos<input name="partos" type="number" min="0" max="30" step="1"/></label>
        <label>Abortos<input name="abortos" type="number" min="0" max="30" step="1"/></label>
      </div>
      <div className="pelvic-checkboxes">{complaints.map(item => <label key={item.value}><input type="checkbox" name="queixas" value={item.value}/>{item.label}</label>)}</div>
      <label>Intercorrências relatadas<textarea name="intercorrencias_relatadas" rows={2} maxLength={2000}/></label>
      <label>Restrições médicas informadas<textarea name="restricoes_medicas_informadas" rows={2} maxLength={2000}/></label>
      <p className="muted">Quando DUM e data da avaliação forem informadas, a idade gestacional é calculada como referência numérica, sem avaliação automática.</p>
    </fieldset> : <fieldset className="pelvic-fieldset"><legend>Dados do pós-parto</legend>
      <div className="form-grid">
        <label>Data do parto<input name="data_parto" type="date"/></label>
        <label>Via do parto<select name="via_parto" defaultValue=""><option value="">Não informada</option><option value="vaginal">Vaginal</option><option value="cesarea">Cesárea</option><option value="outra">Outra</option></select></label>
        <label>Diástase abdominal medida (cm) <small>[validar método]</small><input name="diastase_cm" type="number" min="0" max="30" step="0.1"/></label>
        <label>Amamentação<select name="amamentacao" defaultValue=""><option value="">Não informada</option><option value="sim">Sim</option><option value="nao">Não</option></select></label>
        <label>Retorno à atividade física<select name="retorno_atividade_fisica" defaultValue=""><option value="">Não informado</option><option value="nao">Ainda não</option><option value="parcial">Parcial</option><option value="sim">Sim</option></select></label>
      </div>
      <label>Lacerações / episiotomia relatadas<textarea name="lacracoes_relatadas" rows={2} maxLength={1000}/></label>
      <label>Cicatriz / cicatrização<textarea name="cicatriz_observacoes" rows={2} maxLength={2000}/></label>
      <label>Queixas relatadas<textarea name="queixas_relatadas" rows={2} maxLength={2000}/></label>
      <label>Sinais de alerta relatados <small>[validar checklist clínico]</small><textarea name="sinais_alerta_relatados" rows={2} maxLength={2000}/></label>
    </fieldset>}
    <label>Observações clínicas<textarea name="observacoes" rows={2} maxLength={4000}/></label>
    <label>Plano registrado<textarea name="plano" rows={2} maxLength={4000}/></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="submit" className="primary" disabled={saving}>{saving ? "Salvando…" : "Salvar avaliação"}</button>
  </form>
}
