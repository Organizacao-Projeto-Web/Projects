import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Plus, Search, Users, CalendarDays, Download } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { User, Patient, UserInput, Appointment, AppointmentStatus, AppointmentInput } from "../lib/types";
import { Modal } from "../components/Modal";

export const roleLabel = (role: User["cargo"]) => ({admin: "Administrador", fisioterapeuta: "Fisioterapeuta", recepcao: "Recepção"})[role];
function Heading({title, subtitle, children}: {title: string; subtitle: string; children?: ReactNode}) {
  return <div className="page-heading"><div><span className="eyebrow">SEU ESPAÇO DE CUIDADO</span><h1>{title}</h1><p className="muted">{subtitle}</p></div>{children}</div>;
}
function Notice({children}: {children: ReactNode}) {return <p className="feature-notice" role="status">{children}</p>;}
function Failure({message, retry}: {message: string; retry?: () => void}) {return message ? <div className="error" role="alert">{message} {retry && <button className="text-button" onClick={retry}>Tentar novamente</button>}</div> : null;}

export function Professionals({user, demo, added, onAdd}: {user: User; demo: boolean; added: User[]; onAdd: (u: User) => void}) {
  const [rows, setRows] = useState<User[]>([]);
  const [busy, setBusy] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  async function load() {
    setBusy(true); setError(""); setMissing(false);
    try {setRows(demo ? [user] : await api.professionals());}
    catch(e) {if(e instanceof ApiError && e.status === 404) {setMissing(true); setRows([user]);} else setError((e as Error).message);}
    finally {setBusy(false);}
  }
  useEffect(() => {void load();}, [demo, user.id]);
  const all = Array.from(new Map([...rows, ...added].map(u => [u.id, u])).values());
  const visible = all.filter(u => `${u.nome} ${u.email} ${u.crefito || ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")) && (role === "all" || u.cargo === role));
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setSaveError("");
    const f = new FormData(e.currentTarget);
    const v = (key: string) => String(f.get(key) || "");
    const data: UserInput = {nome: v("nome").trim(), email: v("email").trim(), whatsapp: v("whatsapp"), senha: v("senha"), cargo: v("cargo") as UserInput["cargo"], crefito: v("crefito").trim() || null};
    try {
      if(data.nome.length < 2) throw new Error("Informe um nome com pelo menos 2 caracteres.");
      if(demo && all.some(u => u.email.toLowerCase() === data.email.toLowerCase())) throw new Error("Este e-mail já está cadastrado na demonstração.");
      const saved = demo ? {id: Date.now(), nome: data.nome, email: data.email, cargo: data.cargo, crefito: data.crefito, ativo: true, clinica_id: user.clinica_id} : await api.createUser(data);
      onAdd(saved); setOpen(false); setSuccess(demo ? "Cadastro temporário criado na demonstração." : "Usuário cadastrado com sucesso.");
    } catch(e) {setSaveError((e as Error).message);} finally {setSaving(false);}
  }
  return <><Heading title="Profissionais" subtitle="Pessoas que fazem parte do cuidado.">{user.cargo === "admin" && <button className="primary" onClick={() => {setSaveError(""); setOpen(true);}}><Plus size={18}/> Cadastrar usuário</button>}</Heading>
    {missing ? <Notice>A listagem da equipe ainda não está disponível neste backend. Abaixo estão sua conta e os usuários cadastrados nesta sessão. Os cadastros são salvos, mas a lista completa depende da atualização do backend.</Notice> : <Notice>{demo ? "Equipe fictícia para explorar a interface." : "Esta listagem retorna profissionais clínicos ativos permitidos ao seu perfil. Usuários de recepção criados aqui aparecem durante esta sessão."}</Notice>}
    {user.cargo !== "admin" && <Notice>Somente o administrador pode cadastrar integrantes da equipe.</Notice>}
    {success && <Notice>{success}</Notice>}<Failure message={error} retry={() => void load()}/>
    <section className="panel"><div className="table-toolbar"><label className="search-input"><Search size={18}/><input aria-label="Buscar profissional" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, e-mail ou CREFITO"/></label><select aria-label="Filtrar cargo" value={role} onChange={e => setRole(e.target.value)}><option value="all">Todos os cargos</option><option value="admin">Administrador</option><option value="fisioterapeuta">Fisioterapeuta</option><option value="recepcao">Recepção</option></select></div>
    {busy ? <p className="empty" role="status">Carregando profissionais…</p> : error ? <p className="empty">Não foi possível carregar a equipe.</p> : !visible.length ? <div className="empty"><Users/><h3>Nenhum profissional encontrado</h3><p>Confira os filtros selecionados.</p></div> : <div className="table-scroll"><table><thead><tr><th>Profissional</th><th>Cargo</th><th>CREFITO</th><th>Situação</th></tr></thead><tbody>{visible.map(u => <tr key={u.id}><td><strong>{u.nome}</strong><small className="cell-detail">{u.email}</small></td><td>{roleLabel(u.cargo)}</td><td>{u.crefito || "Não informado"}</td><td><span className="status-pill">{u.ativo ? "Ativo" : "Inativo"}</span></td></tr>)}</tbody></table></div>}</section>
    {open && <Modal title="Cadastrar integrante da equipe" onClose={() => setOpen(false)} busy={saving}><form className="form-stack" onSubmit={save}><label>Nome<input name="nome" required minLength={2} maxLength={150}/></label><label>E-mail<input name="email" type="email" required/></label><div className="form-grid"><label>Cargo<select name="cargo"><option value="fisioterapeuta">Fisioterapeuta</option><option value="recepcao">Recepção</option></select></label><label>CREFITO (opcional)<input name="crefito" minLength={3} maxLength={30}/></label></div><label>WhatsApp com DDD (somente dígitos)<input name="whatsapp" type="tel" required pattern="[0-9]{10,20}" maxLength={20}/></label><label>Senha inicial<input name="senha" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label><Failure message={saveError}/><div className="modal-actions"><button type="button" className="secondary" disabled={saving} onClick={() => setOpen(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? "Salvando…" : "Cadastrar usuário"}</button></div></form></Modal>}
  </>;
}

const localDay = () => {const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const statusLabel = {agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado"};
export function Agenda({user, demo, patients, appointments, onAppointments}: {user: User; demo: boolean; patients: Patient[]; appointments: Appointment[]; onAppointments: (a: Appointment[]) => void}) {
  const [team, setTeam] = useState<User[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [day, setDay] = useState(localDay);
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  async function load() {
    setBusy(true); setError(""); setMissing(false);
    try {
      if(demo) setTeam([user]);
      else {const [list, people] = await Promise.all([api.appointments(), api.professionals()]); onAppointments(list); setTeam(people);}
    } catch(e) {if(e instanceof ApiError && e.status === 404) setMissing(true); else setError((e as Error).message);}
    finally {setBusy(false);}
  }
  useEffect(() => {void load();}, [demo, user.id]);
  const visible = appointments.filter(a => (!day || a.data_hora.slice(0,10) === day) && (status === "all" || a.status === status)).sort((a,b) => a.data_hora.localeCompare(b.data_hora));
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setSaveError("");
    const f = new FormData(e.currentTarget);
    const data: AppointmentInput = {paciente_id: Number(f.get("paciente")), profissional_id: Number(f.get("profissional")), data_hora: String(f.get("horario")), duracao_minutos: Number(f.get("duracao")), observacoes: String(f.get("observacoes") || "").trim() || null};
    try {
      const start = new Date(data.data_hora).getTime(), end = start + data.duracao_minutos * 60000;
      if(demo && appointments.some(a => a.profissional_id === data.profissional_id && a.status !== "cancelado" && start < new Date(a.data_hora).getTime() + a.duracao_minutos * 60000 && end > new Date(a.data_hora).getTime())) throw new Error("Já existe um agendamento para este profissional nesse horário.");
      const saved: Appointment = demo ? {...data, id: Date.now(), clinica_id: user.clinica_id, created_at: new Date().toISOString(), status: "agendado"} : await api.createAppointment(data);
      onAppointments([...appointments, saved]); setDay(saved.data_hora.slice(0,10)); setStatus("all"); setOpen(false);
    } catch(e) {setSaveError((e as Error).message);} finally {setSaving(false);}
  }
  async function change(a: Appointment, next: AppointmentStatus) {
    if(next === "cancelado" && !window.confirm("Cancelar este agendamento?")) return;
    setSaving(true); setError("");
    try {const saved = demo ? {...a, status: next} : await api.appointmentStatus(a.id, next); onAppointments(appointments.map(item => item.id === saved.id ? saved : item));}
    catch(e) {setError((e as Error).message);} finally {setSaving(false);}
  }
  return <><Heading title="Agenda" subtitle="Organize os horários e acompanhe os atendimentos."><button className="primary" disabled={busy || missing || !!error || !patients.length || !team.length} onClick={() => {setSaveError(""); setOpen(true);}}><Plus size={18}/> Novo agendamento</button></Heading>
    {missing && <Notice>A agenda ainda não está habilitada neste backend. A equipe precisa integrar as rotas de agendamentos. Você pode conhecer o fluxo no modo demonstração.</Notice>}
    <Failure message={error} retry={() => void load()}/>
    {!busy && !missing && !patients.length && <Notice>Cadastre uma paciente antes de agendar. <NavLink to="/pacientes">Abrir pacientes</NavLink></Notice>}
    <section className="panel"><div className="table-toolbar"><label>Data <input type="date" value={day} onChange={e => setDay(e.target.value)}/></label><button className="secondary" onClick={() => setDay(localDay())}>Hoje</button><button className="text-button" onClick={() => setDay("")}>Todas as datas</button><select aria-label="Filtrar situação" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todas as situações</option>{Object.entries(statusLabel).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
    {busy ? <p className="empty" role="status">Carregando agenda…</p> : missing ? <div className="empty"><CalendarDays/><h3>Agenda aguardando integração</h3><p>Os horários do banco serão exibidos quando a função estiver disponível.</p></div> : error ? <p className="empty">Não foi possível atualizar a agenda.</p> : !visible.length ? <div className="empty"><CalendarDays/><h3>Nenhum agendamento neste filtro</h3><p>Escolha outra data ou crie um novo horário.</p></div> : <div className="appointment-list">{visible.map(a => <article className="appointment-card" key={a.id}><div className="appointment-time"><strong>{new Date(a.data_hora).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</strong><small>{new Date(a.data_hora).toLocaleDateString("pt-BR")} · {a.duracao_minutos} min</small></div><div className="appointment-person"><h3>{patients.find(p => p.id === a.paciente_id)?.nome || `Paciente #${a.paciente_id}`}</h3><p>{team.find(p => p.id === a.profissional_id)?.nome || `Profissional #${a.profissional_id}`}</p>{a.observacoes && <p>{a.observacoes}</p>}</div><div className="appointment-actions"><span className={`status-pill ${a.status}`}>{statusLabel[a.status]}</span>{a.status === "agendado" && <>{user.cargo !== "recepcao" && <NavLink className="text-button" to={`/pacientes/${a.paciente_id}?novo=1`}>Iniciar atendimento</NavLink>}<button className="text-button" disabled={saving} onClick={() => void change(a,"realizado")}>Marcar realizado</button><button className="text-button danger-text" disabled={saving} onClick={() => void change(a,"cancelado")}>Cancelar</button></>}</div></article>)}</div>}</section>
    {open && <Modal title="Novo agendamento" onClose={() => setOpen(false)} busy={saving}><form className="form-stack" onSubmit={save}><label>Paciente<select name="paciente" required defaultValue=""><option value="" disabled>Selecione a paciente</option>{patients.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label><label>Profissional<select name="profissional" required>{team.filter(u => user.cargo !== "fisioterapeuta" || u.id === user.id).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label><label>Data e horário local<input type="datetime-local" name="horario" required defaultValue={`${day || localDay()}T09:00`}/></label><label>Duração (minutos)<input name="duracao" type="number" required min={15} max={240} defaultValue={60}/></label><label>Observações<textarea name="observacoes" rows={3} maxLength={1000}/></label><Failure message={saveError}/><div className="modal-actions"><button type="button" className="secondary" disabled={saving} onClick={() => setOpen(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? "Salvando…" : "Salvar agendamento"}</button></div></form></Modal>}
  </>;
}

export function Reports({patients, loading, error, demo}: {patients: Patient[]; loading: boolean; error: string; demo: boolean}) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const invalid = !!from && !!to && from > to;
  const filtered = patients.filter(p => (!from || p.created_at.slice(0,10) >= from) && (!to || p.created_at.slice(0,10) <= to));
  const missingPhone = filtered.filter(p => !p.telefone).length;
  const missingBirth = filtered.filter(p => !p.data_nascimento).length;
  function download() {
    // Apenas agregados: não exporta dados pessoais nem conteúdo de prontuário.
    const csv = `\uFEFFIndicador;Quantidade\r\nPacientes cadastrados;${filtered.length}\r\nSem telefone;${missingPhone}\r\nSem data de nascimento;${missingBirth}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"})); const a = document.createElement("a"); a.href=url; a.download=`reab-resumo-${demo ? "demonstracao-" : ""}${localDay()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <><Heading title="Relatórios" subtitle="Resumo cadastral das pacientes acessíveis à sua conta."><button className="secondary" disabled={loading || !!error || invalid} onClick={download}><Download size={18}/> Exportar resumo CSV</button></Heading><Notice>Este resumo considera a data de cadastro. Indicadores de evolução clínica, produtividade e faturamento ainda não estão disponíveis.</Notice><section className="panel report-filters"><div className="form-grid"><label>Cadastradas a partir de<input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>Até<input type="date" value={to} onChange={e => setTo(e.target.value)}/></label></div><button className="text-button" onClick={() => {setFrom("");setTo("");}}>Limpar período</button></section>{invalid ? <Failure message="A data inicial deve ser anterior ou igual à data final."/> : error ? <Failure message="Não foi possível carregar os dados do resumo. Tente carregar as pacientes novamente."/> : loading ? <p role="status">Carregando resumo…</p> : <div className="summary-grid">{[["Pacientes cadastradas",filtered.length],["Sem telefone informado",missingPhone],["Sem data de nascimento",missingBirth]].map(([label,value]) => <section className="panel summary-card" key={label}><span>{label}</span><strong>{value}</strong><small>No período selecionado</small></section>)}</div>}</>;
}

export function SettingsPage({user, demo}: {user: User; demo: boolean}) {
  return <><Heading title="Configurações" subtitle="Confira os dados da sua conta e as informações de acesso."/><div className="settings-grid"><section className="panel settings-card"><h2>Meu perfil</h2><dl>{[["Nome",user.nome],["E-mail",user.email],["Cargo",roleLabel(user.cargo)],["CREFITO",user.crefito || "Não informado"],["Situação",user.ativo ? "Ativo" : "Inativo"]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="muted">A edição do perfil ainda não está disponível. Para correções, fale com o administrador.</p></section><section className="panel settings-card"><h2>Acesso e segurança</h2><p>{demo ? "Você está em uma demonstração com dados fictícios." : "Você está conectado à clínica vinculada à sua conta."}</p><p>A sessão é encerrada ao sair ou recarregar a página.</p><h3>Alterar senha</h3><p>Saia da conta e use “Esqueci minha senha” na tela de login para receber um código no seu e-mail.</p><h3>Permissões</h3><p>{user.cargo === "admin" ? "Você pode cadastrar integrantes da equipe e acessar os prontuários da clínica." : user.cargo === "recepcao" ? "Seu perfil organiza os cadastros e a agenda. Prontuários clínicos são restritos." : "Seu perfil acessa os prontuários da clínica e os próprios agendamentos."}</p></section></div></>;
}
