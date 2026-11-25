import { useEffect, useState } from "react";
import { HashRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { CalendarDays, ChartNoAxesCombined, Heart, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X } from "lucide-react";
import type { Appointment, Consultation, Patient, PatientInput, User } from "./lib/types";
import { api, clearSession } from "./lib/api";
import { demoPatients } from "./lib/demo";
import { resetDemoClinicalAssessments } from "./lib/demoClinical";
import { PatientForm } from "./components/PatientForm";
import { Logo, initials } from "./components/Shared";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Patients } from "./pages/Patients";
import { PatientDetail } from "./pages/PatientDetail";
import { ClinicalModulePage } from "./features/modulos/ClinicalModulePage";
import { Professionals, Agenda, Reports, SettingsPage } from "./pages/Management";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/profissionais", label: "Profissionais", icon: ShieldCheck },
  { to: "/relatorios", label: "Relatórios", icon: ChartNoAxesCombined },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];
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
    resetDemoClinicalAssessments();
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
    resetDemoClinicalAssessments();
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
            <Route path="/pacientes/:id/modulos/:modulo" element={<ClinicalModulePage patients={patients} loading={loading} user={user} demo={demo}
              onAppointmentCompleted={id => setAppointments(rows => rows.map(row => row.id === id ? { ...row, status: "realizado" } : row))} />} />
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
export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
