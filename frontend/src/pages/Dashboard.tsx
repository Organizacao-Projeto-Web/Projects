import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowRight, CalendarDays, ChevronRight, Clock3, FileText, Plus, ShieldCheck, Users } from "lucide-react";
import type { Appointment, ClinicalFollowUp, ModuleAssessmentCount, Patient, User } from "../lib/types";
import { api, ApiError } from "../lib/api";
import { date, initials, modules } from "../components/Shared";

export function Dashboard({
  patients,
  loading,
  demo,
  appointments,
  user,
  onNew,
}: {
  patients: Patient[];
  loading: boolean;
  demo: boolean;
  appointments: Appointment[];
  user: User;
  onNew: () => void;
}) {
  const navigate = useNavigate();
  const [agenda, setAgenda] = useState<Appointment[]>([]);
  const [moduleCounts, setModuleCounts] = useState<ModuleAssessmentCount[]>([]);
  const [moduleCountStatus, setModuleCountStatus] = useState<"loading" | "ready" | "demo" | "restricted" | "error">("loading");
  const [agendaLoading, setAgendaLoading] = useState(!demo);
  const [agendaError, setAgendaError] = useState("");
  const [followUp, setFollowUp] = useState<ClinicalFollowUp[]>([]);
  const [followUpStatus, setFollowUpStatus] = useState<
    "loading" | "ready" | "restricted" | "missing" | "error" | "demo"
  >(demo ? "demo" : "loading");

  // Recarrega ao entrar no dashboard; a Agenda pode ter alterado os horários.
  useEffect(() => {
    if (demo) return;
    let active = true;
    setAgendaLoading(true);
    setAgendaError("");
    api.appointments()
      .then((rows) => { if (active) setAgenda(rows); })
      .catch((error: unknown) => {
        if (active) setAgendaError(
          error instanceof ApiError && error.status === 404
            ? "A agenda não está disponível neste backend."
            : (error as Error).message,
        );
      })
      .finally(() => { if (active) setAgendaLoading(false); });
    return () => { active = false; };
  }, [demo, user.id]);

  useEffect(() => {
    if (demo) { setFollowUpStatus("demo"); return; }
    if (user.cargo === "recepcao") { setFollowUpStatus("restricted"); return; }
    let active = true;
    setFollowUpStatus("loading");
    api.clinicalFollowUp()
      .then((rows) => {
        if (active) {
          setFollowUp(Array.isArray(rows) ? rows : []);
          setFollowUpStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 403)
          setFollowUpStatus("restricted");
        else if (error instanceof ApiError && error.status === 404)
          setFollowUpStatus("missing");
        else setFollowUpStatus("error");
      });
    return () => { active = false; };
  }, [demo, user.id, user.cargo]);

  useEffect(() => {
    if (demo) { setModuleCountStatus("demo"); return; }
    if (user.cargo === "recepcao") { setModuleCountStatus("restricted"); return; }
    let active = true;
    setModuleCountStatus("loading");
    api.clinicalAssessmentCounts()
      .then(counts => { if (active) { setModuleCounts(counts); setModuleCountStatus("ready"); } })
      .catch(() => { if (active) setModuleCountStatus("error"); });
    return () => { active = false; };
  }, [demo, user.id, user.cargo]);

  const allAppointments = demo ? appointments : agenda;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const appointmentsToday = allAppointments
    .filter((a) => a.data_hora.slice(0, 10) === todayKey && a.status !== "cancelado")
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  const upcoming = allAppointments.filter(
    (a) => a.status === "agendado" && new Date(a.data_hora).getTime() >= today.getTime(),
  ).length;
  const completed = allAppointments.filter((a) => a.status === "realizado").length;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VISÃO GERAL</span>
          <h1>
            Olá, {user.nome.split(" ")[0]} <span className="hello-dot">✦</span>
          </h1>
          <p className="muted">
            Um novo dia para acompanhar histórias e cuidar de pessoas.
          </p>
        </div>
        <button className="primary" onClick={onNew}>
          <Plus size={18} /> Nova paciente
        </button>
      </div>
      <section className="welcome-card">
        <div>
          <span className="pill">CUIDADO INTEGRADO</span>
          <h2>
            Cada paciente, uma história.
            <br />
            <span>Cada fase, um novo cuidado.</span>
          </h2>
          <p>
            Encontre suas pacientes e acompanhe os atendimentos
            <br className="desktop-break" /> em um só lugar.
          </p>
          <button
            className="welcome-link"
            onClick={() => navigate("/pacientes")}
          >
            Acessar pacientes <ArrowRight size={17} />
          </button>
        </div>
        <div className="care-art" aria-hidden="true">
          <div className="art-circle" />
          <svg viewBox="0 0 240 190" fill="none">
            <path
              d="M62 173c-13-23-15-47-8-67 8-26 23-38 27-58 3-14-8-20-15-13-9 9-7 25-1 36 10 19 32 24 48 35 14 10 21 27 17 48M176 173c13-23 15-47 8-67-8-26-23-38-27-58-3-14 8-20 15-13 9 9 7 25 1 36-10 19-32 24-48 35-14 10-21 27-17 48"
              stroke="#7592df"
              strokeWidth="2"
            />
            <path
              d="M120 77c-26-19-38-4-34 9 3 11 22 24 34 33 12-9 31-22 34-33 4-13-8-28-34-9Z"
              fill="#fff"
              stroke="#7592df"
              strokeWidth="2"
            />
            <path
              d="M35 128h21l9-15 14 28 12-15h17M166 127h19l9-14 11 25 10-11h18"
              stroke="#a5b7e7"
              strokeWidth="2"
            />
          </svg>
          <span className="art-spark">✧</span>
        </div>
      </section>
      <section className="metrics dashboard-metrics" aria-label="Resumo da clínica">
        <div className="metric">
          <span className="metric-icon blue"><Users size={21} /></span>
          <div>
            <span>Pacientes cadastradas</span>
            <strong>{loading ? "…" : patients.length}</strong>
            <small>{demo ? "Nesta demonstração" : "Na sua clínica"}</small>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon green"><CalendarDays size={21} /></span>
          <div>
            <span>Atendimentos de hoje</span>
            <strong>{agendaLoading && !demo ? "…" : agendaError ? "—" : appointmentsToday.length}</strong>
            <small>Agendados ou realizados</small>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon purple"><Clock3 size={21} /></span>
          <div>
            <span>Próximos agendamentos</span>
            <strong>{agendaLoading && !demo ? "…" : agendaError ? "—" : upcoming}</strong>
            <small>Pendentes, a partir de agora</small>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon pink"><FileText size={21} /></span>
          <div>
            <span>Agendamentos realizados</span>
            <strong>{agendaLoading && !demo ? "…" : agendaError ? "—" : completed}</strong>
            <small>Total disponível na agenda</small>
          </div>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Suas pacientes</h2>
              <p>A continuidade do cuidado começa aqui.</p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("/pacientes")}
            >
              Ver todas <ArrowRight size={15} />
            </button>
          </div>
          {loading ? (
            <p className="empty">Carregando pacientes…</p>
          ) : patients.length === 0 ? (
            <p className="empty">
              Nenhuma paciente cadastrada. Comece pelo botão Nova paciente.
            </p>
          ) : (
            <div className="patient-list">
              {patients.slice(0, 4).map((p, i) => (
                <button
                  key={p.id}
                  className="patient-row"
                  onClick={() => navigate(`/pacientes/${p.id}`)}
                >
                  <span className={`avatar shade-${i % 4}`}>
                    {initials(p.nome)}
                  </span>
                  <span className="patient-row-text">
                    <strong>{p.nome}</strong>
                    <small>Cadastro · {date(p.created_at)}</small>
                  </span>
                  <span className="profile-link">Abrir perfil</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="panel next-panel">
          <span className="metric-icon blue">
            <ArrowDownLeft size={22} />
          </span>
          <span className="eyebrow">PRÓXIMO PASSO</span>
          <h2>
            Um atendimento começa
            <br />
            com uma boa escuta.
          </h2>
          <p>
            Abra o perfil da paciente para consultar o histórico
            {user.cargo !== "recepcao" ? " ou iniciar um novo atendimento" : ""}
            .
          </p>
          <button className="secondary" onClick={() => navigate("/pacientes")}>
            Encontrar paciente <ArrowRight size={16} />
          </button>
          <div className="quiet-note">
            <ShieldCheck size={15} /> Acesso conforme o perfil profissional
          </div>
        </section>
      </div>
      <div className="dashboard-grid dashboard-live-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Agenda de hoje</h2>
              <p>Atendimentos da agenda acessíveis ao seu perfil.</p>
            </div>
            <button className="text-button" onClick={() => navigate("/agenda")}>
              Abrir agenda <ArrowRight size={15} />
            </button>
          </div>
          {!demo && agendaLoading ? (
            <p className="empty" role="status">Carregando agenda…</p>
          ) : agendaError ? (
            <p className="empty" role="alert">{agendaError}</p>
          ) : appointmentsToday.length === 0 ? (
            <p className="empty">Nenhum atendimento para hoje.</p>
          ) : (
            <div className="dashboard-today-list">
              {appointmentsToday.map((a) => (
                <div className="dashboard-today-row" key={a.id}>
                  <strong className="dashboard-today-time">{a.data_hora.slice(11, 16)}</strong>
                  <div>
                    <strong>{patients.find((p) => p.id === a.paciente_id)?.nome || `Paciente #${a.paciente_id}`}</strong>
                    <small>{a.duracao_minutos} minutos</small>
                  </div>
                  <span className={`status-pill ${a.status}`}>
                    {a.status === "realizado" ? "Realizado" : "Agendado"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Acompanhamento clínico</h2>
              <p>Evolução registrada nos atendimentos.</p>
            </div>
          </div>
          {followUpStatus === "loading" ? (
            <p className="empty" role="status">Carregando acompanhamento…</p>
          ) : followUpStatus === "restricted" ? (
            <p className="empty">Acompanhamento clínico restrito para este perfil.</p>
          ) : followUpStatus === "missing" ? (
            <p className="empty">A rota de acompanhamento clínico não está disponível neste backend.</p>
          ) : followUpStatus === "error" ? (
            <p className="empty" role="alert">Não foi possível carregar o acompanhamento clínico.</p>
          ) : followUpStatus === "demo" ? (
            <p className="empty">Acompanhamento clínico indisponível na demonstração.</p>
          ) : followUp.length === 0 ? (
            <p className="empty">Nenhum acompanhamento clínico disponível.</p>
          ) : (
            <div className="dashboard-followup-list">
              {followUp.map((item, index) => (
                <div className="dashboard-followup-row" key={item.paciente_id ?? index}>
                  <div className="dashboard-followup-head">
                    <strong>{item.paciente_nome}</strong>
                    <span className="status-pill">
                      {item.percepcao_paciente === "melhorou" ? "Melhorou"
                        : item.percepcao_paciente === "piorou" ? "Piorou"
                          : item.percepcao_paciente === "igual" ? "Igual" : "Sem percepção"}
                    </span>
                  </div>
                  <p>
                    {item.dor_atual != null
                      ? item.dor_anterior != null
                        ? `Dor ${item.dor_anterior} → ${item.dor_atual}`
                        : `Dor atual: ${item.dor_atual}/10`
                      : "Dor não informada"}
                    {item.sessoes_sem_melhora >= 2 && (
                      <span className="dashboard-followup-alert">
                        {` · ${item.sessoes_sem_melhora} sessões sem melhora`}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="module-section">
        <div className="section-heading">
          <div>
            <h2>Cuidado em todas as fases</h2>
            <p>Áreas de avaliação disponíveis no perfil da paciente.</p>
          </div>
          <span className="planned-badge">Quatro módulos clínicos</span>
        </div>
        <div className="module-grid">
          {modules.map(({ slug, name, description, icon: Icon, color }) => (
            <article className="module-card" key={name}>
              <span className={`metric-icon ${color}`}>
                <Icon size={21} />
              </span>
              <h3>{name}</h3>
              <p>{description}</p>
              {user.cargo !== "recepcao" && <small className="module-count">
                {moduleCountStatus === "ready" ? `${moduleCounts.find(item => item.modulo === slug)?.total ?? 0} avaliações registradas`
                  : moduleCountStatus === "loading" ? "Carregando registros…" : "Contagem indisponível"}
              </small>}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
