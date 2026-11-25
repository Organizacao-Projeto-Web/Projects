import { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, ShieldCheck } from "lucide-react";
import type { ClinicalAssessment, ClinicalAssessmentInput, Patient, PelvicAssessmentV2Data, GestationPostpartumV2Data, RehabilitationV2Data, ClimactericV2Data, User } from "../../lib/types";
import { api } from "../../lib/api";
import { date } from "../../components/Shared";
import { getModule } from "./registry";
import { getDemoClinicalAssessments, saveDemoClinicalAssessment } from "../../lib/demoClinical";
import { PelvicAssessmentForm, symptomNames } from "./PelvicAssessmentForm";
import { GestationPostpartumForm, gestationComplaintLabels } from "./GestationPostpartumForm";
import { RehabilitationForm, rehabilitationRegionNames } from "./RehabilitationForm";
import { ClimactericForm, climactericStageNames, climactericSymptomNames } from "./ClimactericForm";

const kindLabels = {
  avaliacao_inicial: "Avaliação inicial",
  reavaliacao: "Reavaliação",
  evolucao: "Evolução",
};

export function ClinicalModulePage({ patients, loading, user, demo, onAppointmentCompleted }: {
  patients: Patient[]; loading: boolean; user: User; demo: boolean;
  onAppointmentCompleted: (id: number) => void;
}) {
  const { id, modulo } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [agendamentoId, setAgendamentoId] = useState<number | null>(null);
  const patientId = Number(id);
  const patient = patients.find((p) => p.id === patientId);
  const selected = getModule(modulo);
  const [records, setRecords] = useState<ClinicalAssessment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setCreating(false);
    setAgendamentoId(null);
    setNotice("");
    setRecords([]);
    setSelectedId(null);
    setError("");
    if (user.cargo === "recepcao" || !selected || !patient) return;
    if (demo) {
      setRecords(getDemoClinicalAssessments(patient.id).filter(v => v.modulo === selected.slug));
      return;
    }
    let active = true;
    setBusy(true);
    api.clinicalAssessments(patient.id, selected.slug)
      .then((data) => { if (active) setRecords(data); })
      .catch((e: unknown) => { if (active) setError((e as Error).message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [demo, user.cargo, patient?.id, selected?.slug]);

  // Ao iniciar pela Agenda, abre o formulário do módulo selecionado.
  useEffect(() => {
    if (!patient || !selected || user.cargo === "recepcao" || params.get("novo") !== "1") return;
    const raw = params.get("agendamento");
    const numeric = raw && /^\d+$/.test(raw) ? Number(raw) : null;
    setAgendamentoId(numeric && Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null);
    setCreating(true);
    setSelectedId(null);
    setParams({}, { replace: true });
  }, [patient?.id, selected?.slug, user.cargo, params, setParams]);

  async function saveAssessment(input: ClinicalAssessmentInput) {
    if (!patient || !selected || selected.slug !== input.modulo || user.cargo === "recepcao") return;
    if (!demo && !window.confirm(
      `CONFIRME O PRONTUÁRIO\n\nPaciente: ${patient.nome} (ID ${patient.id})\n` +
      `Área clínica: ${selected.name}\n` +
      `Agendamento: ${agendamentoId === null ? "sem vínculo" : `#${agendamentoId}`}\n\n` +
      "Salvar esta avaliação na paciente indicada?"
    )) return;
    setSaving(true);
    setError("");
    try {
      const payload: ClinicalAssessmentInput = agendamentoId !== null ? { ...input, agendamento_id: agendamentoId } : input;
      let created: ClinicalAssessment;
      if (demo) {
        const details = input.dados as PelvicAssessmentV2Data;
        const iciq = input.modulo === "pelvica" ? details.iciq_sf : null;
        created = {
          id: Date.now(), clinica_id: user.clinica_id, paciente_id: patient.id,
          profissional_id: user.id, consulta_id: null, agendamento_id: payload.agendamento_id ?? null,
          modulo: input.modulo, tipo: input.tipo, schema_versao: input.schema_versao,
          dados: input.modulo === "pelvica" ? {
            ...details, iciq_sf: iciq ? {
              ...iciq, pontuacao_total: iciq.frequencia + iciq.quantidade + iciq.interferencia,
            } : null,
          } : input.modulo === "gestacao_posparto" ? (() => {
            const record = input.dados as GestationPostpartumV2Data;
            const gestacao = record.gestacao;
            const days = gestacao?.dum && gestacao?.data_avaliacao
              ? Math.round((Date.parse(gestacao.data_avaliacao + "T00:00:00Z") - Date.parse(gestacao.dum + "T00:00:00Z")) / 86400000)
              : null;
            return { ...record, gestacao: gestacao ? { ...gestacao, idade_gestacional_dias: days } : null };
          })() : input.modulo === "reabilitacao" && input.schema_versao === 2
            ? (input.dados as RehabilitationV2Data)
            : input.modulo === "climaterio" && input.schema_versao === 2
            ? (input.dados as ClimactericV2Data)
            : {
                queixa_principal: input.dados.queixa_principal ?? null,
                dor_atual: input.dados.dor_atual ?? null,
                percepcao_paciente: input.dados.percepcao_paciente ?? null,
                observacoes: input.dados.observacoes ?? null,
                plano: input.dados.plano ?? null,
              },
          status: "registrada", created_at: new Date().toISOString(),
        };
        saveDemoClinicalAssessment(created);
      } else {
        created = await api.createClinicalAssessment(patient.id, payload);
      }
      setRecords(previous => [created, ...previous]);
      setSelectedId(created.id);
      setCreating(false);
      if (agendamentoId !== null) {
        const id = agendamentoId;
        setAgendamentoId(null); // Não vincular uma segunda avaliação por engano.
        try {
          if (!demo) await api.appointmentStatus(id, "realizado");
          onAppointmentCompleted(id);
          navigate("/agenda");
        } catch (error) {
          setNotice("Avaliação salva, mas o agendamento não foi concluído: " +
            (error as Error).message + ". Atualize o status na Agenda sem cadastrar outra avaliação.");
        }
      } else {
        setNotice(demo ? "Avaliação salva apenas nesta demonstração fictícia." : "Avaliação clínica registrada.");
      }
    } catch (error) {
      setError((error as Error).message);
      throw error; // Permite ao formulário exibir o erro e manter os dados digitados.
    } finally {
      setSaving(false);
    }
  }

  if (!selected) return <section className="panel empty"><h2>Área não encontrada</h2><NavLink to="/pacientes">Voltar às pacientes</NavLink></section>;
  if (loading && !patient) return <p role="status">Carregando paciente…</p>;
  if (!patient) return <section className="panel empty"><h2>Paciente não encontrada</h2><NavLink to="/pacientes">Voltar às pacientes</NavLink></section>;
  return (
    <>
      <NavLink className="text-button" to={`/pacientes/${patient.id}`}><ArrowLeft size={17} /> Voltar ao perfil</NavLink>
      <header className="page-heading"><div><h1>{selected.name}</h1><p>{selected.description} · {patient.nome}</p></div></header>
      {user.cargo === "recepcao" ? (
        <section className="panel empty"><ShieldCheck size={30} /><h2>Acesso cadastral</h2><p>Seu perfil não tem acesso aos registros clínicos.</p></section>
      ) : (
        <section className="panel history-panel clinical-module-history">
          <div className="section-heading"><div><h2>Avaliações registradas</h2><p>Histórico clínico específico desta área de cuidado.</p></div>
            {(selected.slug === "pelvica" || selected.slug === "gestacao_posparto" || selected.slug === "reabilitacao" || selected.slug === "climaterio") && <button type="button" className="primary" onClick={() => { if (creating) setAgendamentoId(null); setCreating(v => !v); }}>{creating ? "Fechar formulário" : "Nova avaliação"}</button>}
          </div>
          {creating && <p className="feature-notice" role="status"><strong>Confira a paciente:</strong> {patient.nome} (ID {patient.id}). O registro será salvo neste prontuário.</p>}
          {agendamentoId !== null && creating && <p className="feature-notice" role="status">Avaliação vinculada ao agendamento #{agendamentoId}. Após salvar, tentaremos concluí-lo automaticamente.</p>}
          {notice && <p role="status">{notice}</p>}
          {creating && selected.slug === "pelvica" && <PelvicAssessmentForm onSave={saveAssessment} saving={saving} />}
          {creating && selected.slug === "gestacao_posparto" && <GestationPostpartumForm onSave={saveAssessment} saving={saving} />}
          {creating && selected.slug === "reabilitacao" && <RehabilitationForm onSave={saveAssessment} saving={saving} />}
          {creating && selected.slug === "climaterio" && <ClimactericForm onSave={saveAssessment} saving={saving} />}
          {error && <p role="alert" className="error">{error}</p>}
          {busy ? <p role="status">Carregando avaliações…</p> : !records.length && !error ? (
            <div className="empty"><ClipboardList size={30} /><h3>Nenhuma avaliação registrada</h3><p>{selected.slug === "pelvica" || selected.slug === "gestacao_posparto" || selected.slug === "reabilitacao" || selected.slug === "climaterio" ? "Você pode registrar uma nova avaliação acima." : "O formulário especializado deste módulo está em validação clínica."} Nenhum registro foi criado automaticamente.</p>{demo && <p>Demonstração com dados fictícios; nenhuma chamada à API foi feita.</p>}</div>
          ) : (
            <div className="appointment-list">
              {records.map((record) => (
                <article className="appointment-card" key={record.id}>
                  <div className="appointment-person"><h3>{kindLabels[record.tipo]}</h3><p>{date(record.created_at)} · Registro #{record.id}</p></div>
                  <button className="secondary" type="button" aria-expanded={selectedId === record.id} onClick={() => setSelectedId(selectedId === record.id ? null : record.id)}>{selectedId === record.id ? "Ocultar" : "Ver registro"}</button>
                  {selectedId === record.id && (
                    <div className="panel clinical-print-record" style={{ width: "100%" }}>
                      <h4>{selected.name} · {patient.nome}</h4>
                      <p className="muted">{kindLabels[record.tipo]} · {date(record.created_at)} · Profissional #{record.profissional_id}</p>
                      <button type="button" className="secondary clinical-print-action" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
                      {([
                        ["Queixa principal", record.dados.queixa_principal],
                        ["Dor atual (0–10)", record.dados.dor_atual],
                        ["Percepção", record.dados.percepcao_paciente],
                        ["Observações", record.dados.observacoes],
                        ["Plano", record.dados.plano],
                      ] as const).map(([label, value]) => (
                        <p key={label}><strong>{label}: </strong>{value ?? "Não informado"}</p>
                      ))}
                      {record.modulo === "climaterio" && record.schema_versao === 2 && (() => {
                        const details = record.dados as ClimactericV2Data;
                        return <div className="pelvic-record-details">
                          <h4>Climatério e Menopausa — avaliação registrada</h4>
                          <p><strong>Fase informada:</strong> {details.estagio_informado ? climactericStageNames[details.estagio_informado] : "Não informada"}</p>
                          <p><strong>Última menstruação:</strong> {details.ultima_menstruacao || "Não informada"}</p>
                          <p><strong>Terapia hormonal relatada:</strong> {details.terapia_hormonal_informada === "sim" ? "Sim" : details.terapia_hormonal_informada === "nao" ? "Não" : details.terapia_hormonal_informada === "nao_sabe" ? "Não sabe informar" : "Não informada"}</p>
                          <p><strong>Sintomas:</strong> {details.sintomas?.map(s => climactericSymptomNames[s] ?? s).join(", ") || "Não informados"}</p>
                          <p><strong>Observações sobre sintomas:</strong> {details.observacoes_sintomas || "Não informadas"}</p>
                          <p><strong>Sono:</strong> {details.sono_relatado || "Não informado"}</p>
                          <p><strong>Humor:</strong> {details.humor_relatado || "Não informado"}</p>
                          <p><strong>Sexualidade:</strong> {details.sexualidade_relatada || "Não informada"}</p>
                          <p><strong>Qualidade de vida:</strong> {details.qualidade_vida_relatada || "Não informada"}</p>
                          <p><strong>Saúde óssea informada:</strong> {details.saude_ossea_informada || "Não informada"}</p>
                          <p><strong>Quedas nos últimos 12 meses:</strong> {details.quedas_ultimos_12_meses ?? "Não informadas"}</p>
                          <p><strong>Avaliação funcional:</strong> {details.avaliacao_funcional || "Não informada"}</p>
                          <p className="muted">Informações registradas pelo profissional; sem diagnóstico, classificação ou pontuação automática.</p>
                        </div>;
                      })()}
                      {record.modulo === "reabilitacao" && record.schema_versao === 2 && (() => {
                        const rehab = record.dados as RehabilitationV2Data;
                        return <div className="pelvic-record-details">
                          <h4>Avaliação funcional e reabilitação</h4>
                          <p><strong>Diagnóstico informado:</strong> {rehab.diagnostico_informado || "Não informado"}</p>
                          <p><strong>Lesão/cirurgia relatada:</strong> {rehab.lesao_cirurgia_relatada || "Não informada"} {rehab.data_lesao_cirurgia ? `(${rehab.data_lesao_cirurgia})` : ""}</p>
                          <p><strong>Limitações:</strong> {rehab.limitacoes_funcionais || "Não informadas"}</p>
                          <p><strong>Objetivos da paciente:</strong> {rehab.objetivos_paciente || "Não informados"}</p>
                          {rehab.medidas && rehab.medidas.length > 0 && <div><h4>Medidas registradas</h4><ul>
                            {rehab.medidas.map((m, i) => <li key={i}>{rehabilitationRegionNames[m.regiao] || m.regiao}{m.movimento ? ` — ${m.movimento}` : ""}: amplitude {m.amplitude_graus ?? "—"}°; força {m.forca_manual ?? "—"}/5{m.observacoes ? `; ${m.observacoes}` : ""}</li>)}
                          </ul></div>}
                          <p><strong>Testes funcionais:</strong> {rehab.testes_funcionais || "Não informados"}</p>
                          {rehab.exercicios && rehab.exercicios.length > 0 && <div><h4>Exercícios registrados</h4><ul>
                            {rehab.exercicios.map((e, i) => <li key={i}>{e.nome}: {e.series ?? "—"} séries, {e.repeticoes ?? "—"} repetições{e.observacoes ? `; ${e.observacoes}` : ""}</li>)}
                          </ul></div>}
                          <p><strong>Evolução da sessão:</strong> {rehab.evolucao_sessao || "Não informada"}</p>
                          <p><strong>Meta de autonomia:</strong> {rehab.meta_autonomia || "Não informada"}</p>
                          <p><strong>Critérios de alta:</strong> {rehab.criterios_alta || "Não informados"}</p>
                          <p className="muted">Resultados registrados pelo profissional; métodos e critérios ainda precisam de validação clínica.</p>
                        </div>;
                      })()}
                      {record.modulo === "gestacao_posparto" && record.schema_versao === 2 && (() => {
                        const details = record.dados as GestationPostpartumV2Data;
                        const pregnancy = details.gestacao;
                        const postpartum = details.posparto;
                        const days = pregnancy?.idade_gestacional_dias;
                        return <div className="pelvic-record-details">
                          <h4>{details.fase === "gestacao" ? "Gestação" : "Pós-parto"}</h4>
                          {pregnancy && <>
                            <p><strong>Data da avaliação:</strong> {pregnancy.data_avaliacao || "Não informada"}</p>
                            <p><strong>DUM / DPP informada:</strong> {pregnancy.dum || "—"} / {pregnancy.dpp_informada || "—"}</p>
                            <p><strong>Idade gestacional informativa:</strong> {days == null ? "Não calculada" : `${Math.floor(days/7)} semanas e ${days%7} dias`} <small>[confirmar clinicamente]</small></p>
                            <p><strong>Gestações / partos / abortos:</strong> {pregnancy.gestacoes ?? "—"} / {pregnancy.partos ?? "—"} / {pregnancy.abortos ?? "—"}</p>
                            <p><strong>Queixas:</strong> {pregnancy.queixas?.map(q => gestationComplaintLabels[q] || q).join(", ") || "Não informadas"}</p>
                            <p><strong>Intercorrências:</strong> {pregnancy.intercorrencias_relatadas || "Não informadas"}</p>
                            <p><strong>Restrições médicas:</strong> {pregnancy.restricoes_medicas_informadas || "Não informadas"}</p>
                          </>}
                          {postpartum && <>
                            <p><strong>Data / via do parto:</strong> {postpartum.data_parto || "—"} / {postpartum.via_parto || "—"}</p>
                            <p><strong>Lacerações:</strong> {postpartum.lacracoes_relatadas || "Não informadas"}</p>
                            <p><strong>Cicatriz:</strong> {postpartum.cicatriz_observacoes || "Não informada"}</p>
                            <p><strong>Diástase:</strong> {postpartum.diastase_cm == null ? "Não informada" : `${postpartum.diastase_cm} cm`} <small>[validar método]</small></p>
                            <p><strong>Amamentação:</strong> {postpartum.amamentacao == null ? "Não informada" : postpartum.amamentacao ? "Sim" : "Não"}</p>
                            <p><strong>Retorno à atividade:</strong> {postpartum.retorno_atividade_fisica || "Não informado"}</p>
                            <p><strong>Queixas:</strong> {postpartum.queixas_relatadas || "Não informadas"}</p>
                            <p><strong>Sinais de alerta relatados:</strong> {postpartum.sinais_alerta_relatados || "Não informados"}</p>
                          </>}
                        </div>;
                      })()}
                      {record.modulo === "pelvica" && record.schema_versao === 2 && (() => {
                        const pelvic = record.dados as PelvicAssessmentV2Data;
                        const diary = pelvic.diario_miccional;
                        return <div className="pelvic-record-details">
                          <p><strong>Sintomas:</strong> {pelvic.sintomas?.map(s => symptomNames[s] || s).join(", ") || "Não informados"}</p>
                          <p><strong>Gestações / partos:</strong> {pelvic.gestacoes ?? "—"} / {pelvic.partos ?? "—"}</p>
                          <p><strong>Cirurgias pélvicas:</strong> {pelvic.cirurgias_pelvicas || "Não informadas"}</p>
                          <p><strong>Medicações:</strong> {pelvic.medicamentos_relevantes || "Não informadas"}</p>
                          <p><strong>Força Oxford (0–5):</strong> {pelvic.forca_oxford ?? "Não informada"} <small>[escala em validação]</small></p>
                          <p><strong>Avaliação do assoalho pélvico:</strong> {pelvic.avaliacao_assoalho_pelvico || "Não informada"}</p>
                          {pelvic.iciq_sf && <p><strong>ICIQ-SF:</strong> {pelvic.iciq_sf.pontuacao_total ?? "—"}/21 (informativo; escala em validação)</p>}
                          {diary && <div>
                            <h4>Resumo do diário miccional</h4>
                            <p>Período: {diary.data_inicio || "—"} a {diary.data_fim || "—"}</p>
                            <p>Ingestão média: {diary.ingestao_media_ml ?? "—"} mL/dia · Micções: {diary.miccoes_por_dia ?? "—"}/dia · Noctúria: {diary.nocturia_por_noite ?? "—"}/noite</p>
                            <p>Perdas: {diary.perdas_por_dia ?? "—"}/dia · Urgências: {diary.episodios_urgencia_por_dia ?? "—"}/dia</p>
                            {diary.situacoes_perdas && <p>Situações: {diary.situacoes_perdas}</p>}
                            {diary.observacoes && <p>Observações: {diary.observacoes}</p>}
                          </div>}
                        </div>;
                      })()}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          {selected.slug === "climaterio" && <p className="muted">Ficha preliminar de Climatério e Menopausa: fase relatada e sintomas exigem validação clínica; escalas ainda não foram incorporadas.</p>}
          {selected.slug === "pelvica" && <p className="muted">A ficha pélvica está em versão inicial. Escalas, critérios e campos clínicos exigem validação da equipe responsável.</p>}
          {selected.slug === "gestacao_posparto" && <p className="muted">Ficha preliminar de Gestação e Pós-parto: validar os campos clínicos, os limites e os métodos de avaliação.</p>}
          {selected.slug === "reabilitacao" && <p className="muted">Ficha preliminar de Reabilitação: validar os testes funcionais, os métodos de medição e os limites com a equipe clínica.</p>}
        </section>
      )}
    </>
  );
}
