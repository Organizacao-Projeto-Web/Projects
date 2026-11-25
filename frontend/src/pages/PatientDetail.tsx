import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Clock3, FileText, Plus, Printer, ShieldCheck } from "lucide-react";
import type { Consultation, ConsultationInput, ClinicalAssessment, Patient, User } from "../lib/types";
import { api } from "../lib/api";
import { Modal } from "../components/Modal";
import { date, initials, modules } from "../components/Shared";
import { getDemoClinicalAssessments } from "../lib/demoClinical";
import { getModule } from "../features/modulos/registry";

export function PatientDetail({
  patients,
  loading,
  user,
  demo,
  consultations,
  onConsultation,
  onEdit,
}: {
  patients: Patient[];
  loading: boolean;
  user: User;
  demo: boolean;
  consultations: Consultation[];
  onConsultation: (c: Consultation) => void;
  onEdit: (p: Patient) => void;
}) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const patient = patients.find((p) => p.id === Number(id));
  const [history, setHistory] = useState<Consultation[]>([]);
  const [assessments, setAssessments] = useState<ClinicalAssessment[]>([]);
  const [assessmentsBusy, setAssessmentsBusy] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [error, setError] = useState("");
  const [add, setAdd] = useState(false);
  const [chooseCare, setChooseCare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const canRead = user.cargo !== "recepcao";
  useEffect(() => {
    if (patient && canRead && searchParams.get("novo") === "1") {
      const id = searchParams.get("agendamento");

      setAgendamentoId(
        id && /^\d+$/.test(id) && Number(id) > 0
          ? Number(id)
          : null
      );

      setAdd(true);
      setSearchParams({}, { replace: true });
    }
  }, [patient?.id, canRead, searchParams, setSearchParams]);
  useEffect(() => {
    let active = true;
    setError("");
    setHistory([]);
    if (!canRead || !patient || demo) return;
    setHistoryBusy(true);
    api
      .history(patient.id)
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setHistoryBusy(false);
      });
    return () => {
      active = false;
    };
  }, [patient?.id, demo, canRead]);
  useEffect(() => {
    let active = true;
    setAssessments([]);
    setAssessmentsError("");
    if (!patient || !canRead || demo) return;
    setAssessmentsBusy(true);
    api.allClinicalAssessments(patient.id)
      .then(data => { if (active) setAssessments(data); })
      .catch((error: unknown) => { if (active) setAssessmentsError((error as Error).message); })
      .finally(() => { if (active) setAssessmentsBusy(false); });
    return () => { active = false; };
  }, [patient?.id, demo, canRead]);

  const records = demo
    ? consultations.filter((c) => c.paciente_id === patient?.id)
    : history;
  const clinicalRecords = demo && patient ? getDemoClinicalAssessments(patient.id) : assessments;
  type HistoryEntry = { kind: "consulta"; record: Consultation; created_at: string } |
    { kind: "avaliacao"; record: ClinicalAssessment; created_at: string };
  const timeline: HistoryEntry[] = [
    ...records.map((record): HistoryEntry => ({ kind: "consulta", record, created_at: record.created_at })),
    ...clinicalRecords.map((record): HistoryEntry => ({ kind: "avaliacao", record, created_at: record.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patient) return;
    const f = new FormData(e.currentTarget);
    const text = (key: string) => String(f.get(key) || "").trim();
    const dor = text("dor_atual");
    const percepcao = text("percepcao_paciente");
    const input: ConsultationInput = {
      paciente_id: patient.id,
      queixa_principal: text("queixa"),
      diagnostico: text("diagnostico") || null,
      prescricao: text("prescricao") || null,
      observacoes: text("observacoes") || null,
      dor_atual: dor === "" ? null : Number(dor),
      percepcao_paciente:
        percepcao === "melhorou" || percepcao === "igual" || percepcao === "piorou"
          ? percepcao
          : null,
    };
    if (!input.queixa_principal) {
      setSaveError("Informe a queixa principal.");
      return;
    }
    if (!demo && !window.confirm(
      `CONFIRME O PRONTUÁRIO\n\nPaciente: ${patient.nome} (ID ${patient.id})\n` +
      `Agendamento: ${agendamentoId === null ? "sem vínculo" : `#${agendamentoId}`}\n\n` +
      "Salvar este atendimento nesta paciente?"
    )) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = demo
        ? {
          ...input,
          id: Date.now(),
          medico_id: user.id,
          created_at: new Date().toISOString(),
        }
        : await api.createConsultation(input);
      if (demo) {
        onConsultation(result);
      } else {
        setHistory((prev) => [result, ...prev]);
      }

      setAdd(false);

      if (!demo && agendamentoId !== null) {
        try {
          await api.appointmentStatus(agendamentoId, "realizado");
        } catch (err) {
          setError(
            "O atendimento foi salvo, mas não foi possível concluir o agendamento: " +
            (err as Error).message +
            ". Atualize o status na Agenda sem cadastrar outra consulta."
          );
          return;
        }

        setAgendamentoId(null);
        navigate("/agenda");
      }
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <p className="empty">Carregando paciente…</p>;
  if (!patient)
    return (
      <div className="panel empty">
        <h2>Paciente não encontrada</h2>
        <button className="secondary" onClick={() => navigate("/pacientes")}>
          Voltar para pacientes
        </button>
      </div>
    );
  return (
    <div className="patient-detail">
      <button
        className="text-button back-link"
        onClick={() => navigate("/pacientes")}
      >
        ← Voltar para pacientes
      </button>
      <div className="page-heading">
        <div className="profile-heading">
          <span className="avatar large">{initials(patient.nome)}</span>
          <div>
            <span className="eyebrow">PERFIL DA PACIENTE</span>
            <h1>{patient.nome}</h1>
          </div>
        </div>
        <button className="secondary" onClick={() => onEdit(patient)}>
          Editar cadastro
        </button>
      </div>
      <section className="panel patient-facts">
        <div>
          <span>CPF</span>
          <strong>{patient.cpf || "Não informado"}</strong>
        </div>
        <div>
          <span>Telefone</span>
          <strong>{patient.telefone || "Não informado"}</strong>
        </div>
        <div>
          <span>Nascimento</span>
          <strong>{date(patient.data_nascimento)}</strong>
        </div>
        <div>
          <span>Cadastrada em</span>
          <strong>{date(patient.created_at)}</strong>
        </div>
      </section>
      {canRead ? (
        <>
          <section className="panel history-panel">
            <div className="section-heading">
              <div>
                <h2>Histórico clínico integrado</h2>
                <p>Consultas e avaliações especializadas, da mais recente para a mais antiga.</p>
              </div>
              <div className="history-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => window.print()}
                  disabled={historyBusy || assessmentsBusy || Boolean(error || assessmentsError) || timeline.length === 0}
                >
                  <Printer size={17} /> Imprimir / Salvar PDF
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    setSaveError("");
                    setAgendamentoId(null);
                    setChooseCare(true);
                  }}
                >
                  <Plus size={17} /> Realizar atendimento
                </button>
              </div>
            </div>
            {error && <p role="alert" className="error">Falha nas consultas: {error}</p>}
            {assessmentsError && <p role="alert" className="error">Falha nas avaliações especializadas: {assessmentsError}</p>}
            {historyBusy || assessmentsBusy ? (
              <p className="empty">Carregando histórico…</p>
            ) : timeline.length === 0 && !error && !assessmentsError ? (
              <div className="empty">
                <FileText size={30} />
                <h3>Uma nova jornada começa aqui</h3>
                <p>Nenhum atendimento registrado para esta paciente.</p>
              </div>
            ) : (
              timeline.map((entry) => {
                if (entry.kind === "avaliacao") {
                  const a = entry.record;
                  return <article className="consultation" key={`avaliacao-${a.id}`}>
                    <span className="record-date"><Clock3 size={15} />{date(a.created_at)} · Avaliação especializada {demo && "· Demonstração"}</span>
                    <h3>{getModule(a.modulo)?.name ?? a.modulo} — {a.tipo === "avaliacao_inicial" ? "Avaliação inicial" : a.tipo === "reavaliacao" ? "Reavaliação" : "Evolução"}</h3>
                    {a.dados.queixa_principal && <p><strong>Queixa principal</strong><span>{a.dados.queixa_principal}</span></p>}
                    <div className="consultation-clinical">
                      <span>Dor: {a.dados.dor_atual == null ? "Não informada" : `${a.dados.dor_atual}/10`}</span>
                      <span>Percepção: {a.dados.percepcao_paciente ?? "Não informada"}</span>
                    </div>
                    {a.dados.observacoes && <p><strong>Observações</strong><span>{a.dados.observacoes}</span></p>}
                    {a.dados.plano && <p><strong>Plano de cuidado</strong><span>{a.dados.plano}</span></p>}
                    <p className="clinical-record-links"><NavLink to={`/pacientes/${patient.id}/modulos/${a.modulo}`}>Abrir ficha clínica completa</NavLink></p>
                  </article>;
                }
                const c = entry.record;
                return (
                <article className="consultation" key={`consulta-${c.id}`}>
                  <span className="record-date">
                    <Clock3 size={15} />
                    {date(c.created_at)}
                    {demo && " · Demonstração"}
                  </span>
                  <h3>{c.queixa_principal}</h3>
                  <div className="consultation-clinical">
                    <span>
                      Dor atual: {c.dor_atual != null ? `${c.dor_atual}/10` : "Não informada"}
                    </span>
                    <span>
                      Percepção: {c.percepcao_paciente === "melhorou"
                        ? "Melhorou"
                        : c.percepcao_paciente === "igual"
                          ? "Permaneceu igual"
                          : c.percepcao_paciente === "piorou"
                            ? "Piorou"
                            : c.percepcao_paciente || "Não informada"}
                    </span>
                  </div>
                  {[
                    ["Diagnóstico", c.diagnostico],
                    ["Conduta / prescrição", c.prescricao],
                    ["Observações", c.observacoes],
                  ].map(
                    ([label, value]) =>
                      value && (
                        <p key={label}>
                          <strong>{label}</strong>
                          <span>{value}</span>
                        </p>
                      ),
                  )}
                </article>
                );
              })
            )}
          </section>
          <div className="section-heading">
            <div>
              <h2>Áreas de atendimento</h2>
              <p>
                Avaliações e evoluções dos quatro módulos. Conteúdo clínico sujeito à validação profissional.
              </p>
            </div>
          </div>
          <div className="module-grid">
            {modules.map((m) => (
              <article className="module-card" key={m.name}>
                <span className={`metric-icon ${m.color}`}>
                  <m.icon size={20} />
                </span>
                <h3>{m.name}</h3>
                <span className="planned-badge">Avaliações disponíveis</span>
                <NavLink className="text-button" to={`/pacientes/${patient.id}/modulos/${m.slug}`}>
                  Ver avaliações
                </NavLink>
              </article>
            ))}
          </div>
        </>
      ) : (
        <section className="panel empty">
          <ShieldCheck size={30} />
          <h2>Acesso cadastral</h2>
          <p>
            O perfil de recepção não tem acesso ao histórico clínico ou ao
            registro de atendimentos.
          </p>
        </section>
      )}
      {chooseCare && canRead && (
        <Modal
          title="Escolher área de atendimento"
          onClose={() => setChooseCare(false)}
          busy={false}
        >
          <div className="form-stack">
            <p className="muted">Paciente: <strong>{patient.nome}</strong> (ID {patient.id})</p>
            <p>Selecione o tipo de atendimento que será registrado neste prontuário.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setChooseCare(false);
                setAdd(true);
              }}
            >
              Atendimento geral
            </button>
            {modules.map((m) => (
              <button
                type="button"
                className="secondary"
                key={m.slug}
                onClick={() => {
                  setChooseCare(false);
                  navigate(`/pacientes/${patient.id}/modulos/${m.slug}?novo=1`);
                }}
              >
                {m.name}
              </button>
            ))}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setChooseCare(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
      {add && (
        <Modal
          title="Novo atendimento"
          onClose={() => setAdd(false)}
          busy={saving}
        >
          <form className="form-stack" onSubmit={save}>
            <p className="muted">
              Paciente: <strong>{patient.nome}</strong> (ID {patient.id})
              {demo && " · Registro temporário de demonstração"}
            </p>
            <label>
              Queixa principal *
              <textarea autoFocus name="queixa" required rows={3} />
            </label>
            <label>
              Diagnóstico
              <textarea name="diagnostico" rows={2} />
            </label>
            <label>
              Conduta / prescrição
              <textarea name="prescricao" rows={2} />
            </label>
            <label>
              Observações
              <textarea name="observacoes" rows={2} />
            </label>
            <label>
              Dor atual (escala de 0 a 10)
              <select name="dor_atual" defaultValue="">
                <option value="">Não informada</option>
                {Array.from({ length: 11 }, (_, value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Percepção da paciente
              <select name="percepcao_paciente" defaultValue="">
                <option value="">Não informada</option>
                <option value="melhorou">Melhorou</option>
                <option value="igual">Permaneceu igual</option>
                <option value="piorou">Piorou</option>
              </select>
            </label>
            {saveError && (
              <p className="error" role="alert">
                {saveError}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAdd(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button className="primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar atendimento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
