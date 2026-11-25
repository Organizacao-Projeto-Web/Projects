import { useState } from "react";
import type { FormEvent } from "react";
import { Activity, ArrowRight, Eye, EyeOff, Heart } from "lucide-react";
import type { User } from "../lib/types";
import { api, clearSession } from "../lib/api";
import { demoUser } from "../lib/demo";
import { AccountForm } from "../components/AccountForms";
import { Logo } from "../components/Shared";

export function Login({
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
