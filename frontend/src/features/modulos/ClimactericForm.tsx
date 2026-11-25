import { useState } from "react";
import type { FormEvent } from "react";
import type { AssessmentKind, ClinicalAssessmentInput, ClimactericStage, ClimactericSymptom, ClimactericV2Data } from "../../lib/types";
import "./PelvicAssessment.css";

const symptoms: { value: ClimactericSymptom; label: string }[] = [
  { value: "fogachos", label: "Ondas de calor" },
  { value: "sudorese_noturna", label: "Suores noturnos" },
  { value: "ressecamento_vaginal", label: "Ressecamento vaginal" },
  { value: "sintomas_urinarios", label: "Sintomas urinários" },
  { value: "dor_musculoesqueletica", label: "Queixas musculoesqueléticas" },
  { value: "alteracao_sono", label: "Alterações do sono" },
  { value: "alteracao_humor", label: "Alterações do humor" },
  { value: "outro", label: "Outro sintoma" },
];
export const climactericSymptomNames = Object.fromEntries(symptoms.map(x => [x.value, x.label])) as Record<ClimactericSymptom, string>;
export const climactericStageNames: Record<ClimactericStage, string> = {
  pre: "Pré-menopausa", peri: "Perimenopausa", pos: "Pós-menopausa",
};

export function ClimactericForm({ onSave, saving }: {
  onSave: (input: ClinicalAssessmentInput) => Promise<void>;
  saving: boolean;
}) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const optional = (key: string) => text(key) || null;
    const falls = text("quedas_ultimos_12_meses");
    const dados: ClimactericV2Data = {
      queixa_principal: optional("queixa_principal"),
      dor_atual: text("dor_atual") === "" ? null : Number(text("dor_atual")),
      percepcao_paciente: optional("percepcao_paciente") as ClimactericV2Data["percepcao_paciente"],
      observacoes: optional("observacoes"), plano: optional("plano"),
      estagio_informado: optional("estagio_informado") as ClimactericV2Data["estagio_informado"],
      ultima_menstruacao: optional("ultima_menstruacao"),
      terapia_hormonal_informada: optional("terapia_hormonal_informada") as ClimactericV2Data["terapia_hormonal_informada"],
      sintomas: form.getAll("sintomas").length ? form.getAll("sintomas") as ClimactericSymptom[] : null,
      observacoes_sintomas: optional("observacoes_sintomas"),
      sexualidade_relatada: optional("sexualidade_relatada"),
      qualidade_vida_relatada: optional("qualidade_vida_relatada"),
      saude_ossea_informada: optional("saude_ossea_informada"),
      quedas_ultimos_12_meses: falls === "" ? null : Number(falls),
      sono_relatado: optional("sono_relatado"),
      humor_relatado: optional("humor_relatado"),
      avaliacao_funcional: optional("avaliacao_funcional"),
    };
    setError("");
    try {
      await onSave({ modulo: "climaterio", tipo: text("tipo") as AssessmentKind, schema_versao: 2, dados });
    } catch (err) { setError((err as Error).message); }
  }
  return <form className="form-stack pelvic-form" onSubmit={e => void submit(e)}>
    <h3>Nova avaliação — Climatério e Menopausa</h3>
    <p className="muted">Dados informados pela paciente e registrados pelo profissional. A fase relatada não equivale a diagnóstico. Escalas de sintomas ainda aguardam validação clínica.</p>
    <label>Tipo de registro<select name="tipo" required defaultValue="avaliacao_inicial">
      <option value="avaliacao_inicial">Avaliação inicial</option>
      <option value="reavaliacao">Reavaliação</option>
      <option value="evolucao">Evolução</option>
    </select></label>
    <label>Queixa principal<textarea name="queixa_principal" required minLength={1} maxLength={2000} rows={2}/></label>
    <div className="form-grid">
      <label>Dor atual (0–10)<input name="dor_atual" type="number" min="0" max="10" step="1" /></label>
      <label>Percepção da paciente<select name="percepcao_paciente" defaultValue="">
        <option value="">Não informada</option><option value="melhorou">Melhorou</option>
        <option value="igual">Igual</option><option value="piorou">Piorou</option>
      </select></label>
    </div>
    <fieldset className="pelvic-fieldset"><legend>Histórico informado</legend>
      <div className="form-grid">
        <label>Fase informada<select name="estagio_informado" defaultValue="">
          <option value="">Não informada</option>
          <option value="pre">Pré-menopausa</option><option value="peri">Perimenopausa</option>
          <option value="pos">Pós-menopausa</option>
        </select></label>
        <label>Última menstruação (se informada)<input name="ultima_menstruacao" type="date" /></label>
        <label>Uso de terapia hormonal informado<select name="terapia_hormonal_informada" defaultValue="">
          <option value="">Não informado</option><option value="sim">Sim</option>
          <option value="nao">Não</option><option value="nao_sabe">Não sabe informar</option>
        </select></label>
      </div>
    </fieldset>
    <fieldset className="pelvic-fieldset"><legend>Sintomas relatados</legend>
      <div className="pelvic-checkboxes">
        {symptoms.map(s => <label key={s.value}><input name="sintomas" type="checkbox" value={s.value}/>{s.label}</label>)}
      </div>
      <label>Observações sobre os sintomas<textarea name="observacoes_sintomas" maxLength={2000} rows={2}/></label>
      <label>Relato sobre sono<textarea name="sono_relatado" maxLength={2000} rows={2}/></label>
      <label>Relato sobre humor<textarea name="humor_relatado" maxLength={2000} rows={2}/></label>
    </fieldset>
    <fieldset className="pelvic-fieldset"><legend>Qualidade de vida e funcionalidade</legend>
      <label>Impacto na sexualidade<textarea name="sexualidade_relatada" maxLength={2000} rows={2}/></label>
      <label>Impacto na qualidade de vida<textarea name="qualidade_vida_relatada" maxLength={2000} rows={2}/></label>
      <label>Saúde óssea — dados informados, sem interpretação de exames<textarea name="saude_ossea_informada" maxLength={2000} rows={2}/></label>
      <label>Quedas nos últimos 12 meses (relatadas)<input name="quedas_ultimos_12_meses" type="number" min="0" max="100" step="1" /></label>
      <label>Avaliação funcional registrada<textarea name="avaliacao_funcional" maxLength={2000} rows={2}/></label>
    </fieldset>
    <label>Observações clínicas<textarea name="observacoes" maxLength={4000} rows={2}/></label>
    <label>Plano registrado<textarea name="plano" maxLength={4000} rows={2}/></label>
    {error && <p role="alert" className="error">{error}</p>}
    <button type="submit" className="primary" disabled={saving}>{saving ? "Salvando…" : "Salvar avaliação"}</button>
  </form>;
}
