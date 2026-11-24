import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  HashRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type {
  Consultation,
  ConsultationInput,
  Patient,
  PatientInput,
  User, Appointment, ClinicalFollowUp,
} from "./lib/types";
import { api, ApiError, clearSession } from "./lib/api";
import { demoPatients, demoUser } from "./lib/demo";
import { PatientForm } from "./components/PatientForm";
import { Modal } from "./components/Modal";

import { Professionals, Agenda, Reports, SettingsPage } from "./pages/Management";
import { AccountForm } from "./components/AccountForms";

const modules = [
  {
    name: "Fisioterapia Pélvica",
    description: "Avaliação e cuidado uroginecológico",
    icon: Activity,
    color: "blue",
  },
  {
    name: "Gestação e Pós-parto",
    description: "Cuidado em cada nova fase",
    icon: Heart,
    color: "pink",
  },
  {
    name: "Reabilitação",
    description: "Movimento, autonomia e bem-estar",
    icon: Sparkles,
    color: "green",
  },
  {
    name: "Climatério e Menopausa",
    description: "Acolhimento ao longo da vida",
    icon: Users,
    color: "purple",
  },
];
const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/profissionais", label: "Profissionais", icon: ShieldCheck },
  { to: "/relatorios", label: "Relatórios", icon: ChartNoAxesCombined },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR").format(
      new Date(value.length === 10 ? `${value}T12:00:00` : value),
    )
    : "Não informada";
function Logo() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 2v20M8 6h8M7 10h10M8 14h8M9 18h6" />
          <circle cx="12" cy="6" r="1.4" />
          <circle cx="12" cy="10" r="1.4" />
          <circle cx="12" cy="14" r="1.4" />
        </svg>
      </span>
      <span>
        <strong>
          Reab<span className="brand-dot">.</span>
        </strong>
        <small>GESTÃO DE FISIOTERAPIA</small>
      </span>
    </div>
  );
}
function Login({
  onLogin,
  message,
}: {
  onLogin: (user: User, demo: boolean) => void;
  message: string;
}) {
  const [account, setAccount] = useState<"register" | "reset" | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(message);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      onLogin(
        await api.login(String(f.get("email")), String(f.get("password"))),
        false,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <aside className="login-aside">
        <Logo />
        <div>
          <span className="eyebrow">CUIDADO QUE ACOMPANHA</span>
          <h1>
            Mais presença.
            <br />
            Mais cuidado.
            <br />
            <em>Em cada fase.</em>
          </h1>
          <p>
            Um espaço para organizar sua rotina e acompanhar a jornada de cada
            paciente.
          </p>
          <div className="login-illustration">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <Activity size={76} strokeWidth={1} />
            <span className="floating-note">
              <Heart size={18} /> A paciente no centro de tudo
            </span>
          </div>
        </div>
        <small>Reab · Gestão de Fisioterapia</small>
      </aside>
      <main className="login-main">
        <div className="login-card">
          <span className="eyebrow">SEU ESPAÇO DE CUIDADO</span>
          <h2>Bem-vindo de volta</h2>
          <p className="muted">Entre com sua conta para continuar.</p>
          <form onSubmit={submit} className="form-stack">
            <label>
              E-mail
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="voce@clinica.com.br"
              />
            </label>
            <label>
              Senha
              <div className="password">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar na minha conta"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="demo-entry">
            <span>CONHEÇA A PRIMEIRA VERSÃO</span>
            <button
              className="secondary full"
              disabled={busy}
              onClick={() => {
                clearSession();
                onLogin(demoUser, true);
              }}
            >
              Explorar demonstração <ArrowRight size={17} />
            </button>
            <p>
              Sem banco de dados. Informações fictícias, mantidas apenas
              enquanto esta página estiver aberta.
            </p>
          </div>
          <div className="login-foot account-links"><button className="text-button" disabled={busy} onClick={() => setAccount("reset")}>Esqueci minha senha</button><button className="text-button" disabled={busy} onClick={() => setAccount("register")}>Cadastrar minha clínica</button></div>
          {account && <AccountForm kind={account} onClose={() => setAccount(null)} />}
        </div>
      </main>
    </div>
  );
}
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [demo, setDemo] = useState(false);
  const [addedUsers, setAddedUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [menu, setMenu] = useState(false);
  const [form, setForm] = useState<Patient | "new" | null>(null);
  const [toast, setToast] = useState("");
  const navigate = useNavigate();
  function logout(message = "") {
    clearSession();
    setUser(null);
    setPatients([]);
    setConsultations([]);
    setAddedUsers([]);
    setAppointments([]);
    setForm(null);
    setMenu(false);
    setDemo(false);
    setToast("");
    setSessionMessage(message);
    navigate("/");
  }
  useEffect(() => {
    const expire = () => logout("Sua sessão expirou. Entre novamente.");
    window.addEventListener("reab:expired", expire);
    return () => window.removeEventListener("reab:expired", expire);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  async function loadPatients() {
    setLoading(true);
    setLoadError("");
    try {
      setPatients(await api.patients());
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user && !demo) void loadPatients();
  }, [user, demo]);
  function login(u: User, isDemo: boolean) {
    setUser(u);
    setDemo(isDemo);
    setLoadError("");
    setPatients(isDemo ? demoPatients.map((p) => ({ ...p })) : []);
    setConsultations([]);
    setAddedUsers([]);
    setAppointments([]);
    navigate("/");
  }
  async function savePatient(data: PatientInput) {
    if (
      demo &&
      data.cpf &&
      patients.some(
        (p) =>
          p.cpf === data.cpf &&
          p.id !== (form && form !== "new" ? form.id : undefined),
      )
    )
      throw new Error("Já existe uma paciente com esse CPF.");
    const editing = form && form !== "new" ? form : null;
    const saved = demo
      ? {
        ...data,
        id: editing?.id ?? Date.now(),
        clinica_id: 1,
        created_at: editing?.created_at ?? new Date().toISOString(),
      }
      : editing
        ? await api.updatePatient(editing.id, data)
        : await api.createPatient(data);
    setPatients((prev) =>
      editing
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...prev],
    );
    setToast(
      demo
        ? "Paciente salva nesta demonstração."
        : "Paciente salva com sucesso.",
    );
  }
  if (!user) return <Login onLogin={login} message={sessionMessage} />;
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#conteudo"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("conteudo")?.focus();
        }}
      >
        Ir para o conteúdo
      </a>
      {menu && (
        <button
          className="sidebar-shade"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Logo />
        <button
          className="mobile-close icon-btn"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <div className="workspace-tag">
          <span className="workspace-symbol">R</span>
          <div>
            <strong>{demo ? "Espaço de demonstração" : "Meu espaço"}</strong>
            <small>{demo ? "Dados fictícios" : "Ambiente conectado"}</small>
          </div>
        </div>
        <span className="nav-caption">PRINCIPAL</span>
        <nav aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <span className="mini-mark">
              <Heart size={19} />
            </span>
            <strong>Cuidar começa com você.</strong>
            <p>
              Organize sua rotina.
              <br />
              Abra espaço para o cuidado.
            </p>
          </div>
          <button className="logout" onClick={() => logout()}>
            <LogOut size={18} /> Sair da conta
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle icon-btn"
              aria-label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>
              Seu espaço de cuidado <span className="topbar-divider">/</span>{" "}
              <strong>Reab</strong>
            </span>
          </div>
          <div className="user-chip">
            <span className="avatar small">{initials(user.nome)}</span>
            <div>
              <strong>{user.nome}</strong>
              <small>
                {user.cargo === "admin"
                  ? "Administrador"
                  : user.cargo === "recepcao"
                    ? "Recepção"
                    : "Fisioterapeuta"}
              </small>
            </div>
          </div>
        </header>
        <main id="conteudo" tabIndex={-1} className="content">
          <div className={`mode-banner ${demo ? "" : "connected"}`}>
            <span>
              <span className="status-dot" />
              {demo ? "Modo demonstração" : "Conectado à API"}
            </span>
            <p>
              {demo
                ? "Dados fictícios • alterações temporárias, sem gravação no banco"
                : "As alterações são salvas no banco configurado no backend."}
            </p>
          </div>
          {loadError && (
            <div className="error" role="alert">
              {loadError}{" "}
              <button
                className="text-button"
                onClick={() => void loadPatients()}
              >
                Tentar novamente
              </button>
            </div>
          )}
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  patients={patients}
                  loading={loading}
                  demo={demo}
                  appointments={appointments}
                  user={user}
                  onNew={() => setForm("new")}
                />
              }
            />
            <Route
              path="/pacientes"
              element={
                <Patients
                  patients={patients}
                  loading={loading}
                  onNew={() => setForm("new")}
                />
              }
            />
            <Route
              path="/pacientes/:id"
              element={
                <PatientDetail
                  patients={patients}
                  loading={loading}
                  user={user}
                  demo={demo}
                  consultations={consultations}
                  onConsultation={(c) =>
                    setConsultations((prev) => [c, ...prev])
                  }
                  onEdit={(p) => setForm(p)}
                />
              }
            />
            <Route path="/profissionais" element={<Professionals user={user} demo={demo} added={addedUsers} onAdd={u => setAddedUsers(prev => [...prev, u])} />} />
            <Route path="/agenda" element={<Agenda user={user} demo={demo} patients={patients} appointments={appointments} onAppointments={setAppointments} />} />
            <Route path="/relatorios" element={<Reports patients={patients} loading={loading} error={loadError} demo={demo} />} />
            <Route path="/configuracoes" element={<SettingsPage user={user} demo={demo} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="page-footer">
            <span>Reab · Gestão de Fisioterapia</span>
            <span>Uma jornada de cuidado, juntas.</span>
          </footer>
        </main>
      </div>
      {form && (
        <PatientForm
          patient={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSave={savePatient}
        />
      )}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <ShieldCheck size={18} />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
function Dashboard({
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
            <p>Áreas planejadas para o perfil da paciente.</p>
          </div>
          <span className="planned-badge">Em planejamento</span>
        </div>
        <div className="module-grid">
          {modules.map(({ name, description, icon: Icon, color }) => (
            <article className="module-card" key={name}>
              <span className={`metric-icon ${color}`}>
                <Icon size={21} />
              </span>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
function Patients({
  patients,
  loading,
  onNew,
}: {
  patients: Patient[];
  loading: boolean;
  onNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  const digits = search.replace(/\D/g, "");
  const filtered = patients.filter(
    (p) =>
      p.nome.toLocaleLowerCase("pt-BR").includes(normalized) ||
      (digits.length > 0 && p.cpf?.includes(digits)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PESSOAS NO CENTRO</span>
          <h1>Pacientes</h1>
          <p className="muted">
            Dados cadastrais e acesso à jornada de cuidado.
          </p>
        </div>
        <button className="primary" onClick={onNew}>
          <Plus size={18} /> Nova paciente
        </button>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <label className="search-box">
            <Search size={18} />
            <input
              aria-label="Buscar pacientes por nome ou CPF"
              placeholder="Buscar por nome ou CPF…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="muted">{filtered.length} paciente(s)</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Nascimento</th>
                <th>
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-person">
                      <span className={`avatar shade-${i % 4}`}>
                        {initials(p.nome)}
                      </span>
                      <strong>{p.nome}</strong>
                    </div>
                  </td>
                  <td>{p.cpf || "Não informado"}</td>
                  <td>{p.telefone || "Não informado"}</td>
                  <td>{date(p.data_nascimento)}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => navigate(`/pacientes/${p.id}`)}
                      aria-label={`Abrir perfil de ${p.nome}`}
                    >
                      Abrir perfil <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <p className="empty">Carregando pacientes…</p>
        ) : (
          filtered.length === 0 && (
            <p className="empty">
              {search
                ? "Nenhuma paciente encontrada para essa busca."
                : "Ainda não há pacientes. Cadastre a primeira para começar."}
            </p>
          )
        )}
      </section>
    </>
  );
}
function PatientDetail({
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
  const [historyBusy, setHistoryBusy] = useState(false);
  const [error, setError] = useState("");
  const [add, setAdd] = useState(false);
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
  const records = demo
    ? consultations.filter((c) => c.paciente_id === patient?.id)
    : history;
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
                <h2>Histórico de atendimentos</h2>
                <p>Registros em ordem do mais recente para o mais antigo.</p>
              </div>
              <div className="history-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => window.print()}
                  disabled={historyBusy || Boolean(error) || records.length === 0}
                >
                  <Printer size={17} /> Imprimir / Salvar PDF
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    setSaveError("");
                    setAdd(true);
                  }}
                >
                  <Plus size={17} /> Novo atendimento
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {historyBusy ? (
              <p className="empty">Carregando histórico…</p>
            ) : records.length === 0 && !error ? (
              <div className="empty">
                <FileText size={30} />
                <h3>Uma nova jornada começa aqui</h3>
                <p>Nenhum atendimento registrado para esta paciente.</p>
              </div>
            ) : (
              records.map((c) => (
                <article className="consultation" key={c.id}>
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
              ))
            )}
          </section>
          <div className="section-heading">
            <div>
              <h2>Áreas de atendimento</h2>
              <p>
                Formulários especializados serão adicionados após validação
                clínica.
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
                <span className="planned-badge">Em planejamento</span>
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
      {add && (
        <Modal
          title="Novo atendimento"
          onClose={() => setAdd(false)}
          busy={saving}
        >
          <form className="form-stack" onSubmit={save}>
            <p className="muted">
              Paciente: <strong>{patient.nome}</strong>
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
export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
