import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import { Modal } from "./Modal";

export function AccountForm({kind, onClose}: {kind: "register" | "reset"; onClose: () => void}) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const value = (k: string) => String(f.get(k) || "");
    try {
      if (kind === "register" || step === 2) {
        if(value("senha") !== value("confirmacao")) throw new Error("As senhas não coincidem.");
      }
      if (kind === "register") {
        await api.register({clinica: {nome: value("clinica").trim(), cnpj: value("cnpj").replace(/\D/g, "")}, responsavel: {nome: value("nome").trim(), email: value("email").trim(), whatsapp: value("whatsapp").replace(/\D/g, ""), senha: value("senha"), crefito: value("crefito").trim() || null}});
        setDone(true);
      } else if(step === 0) {
        const target = value("email").trim(); await api.requestReset(target); setEmail(target); setStep(1);
      } else if(step === 1) {
        const result = await api.verifyReset(email, value("codigo")); setToken(result.reset_token); setStep(2);
      } else {await api.resetPassword(token, value("senha")); setToken(""); setDone(true);}
    } catch(err) {setError((err as Error).message);} finally {setBusy(false);}
  }
  return <Modal title={kind === "register" ? "Cadastrar clínica e responsável" : "Recuperar senha"} onClose={onClose} busy={busy}>
    {done ? <div className="form-stack"><p role="status">{kind === "register" ? "Cadastro concluído. Entre com o e-mail e a senha que você definiu." : "Senha atualizada. Você já pode entrar com a nova senha."}</p><button className="primary" onClick={onClose}>Voltar ao login</button></div> :
    <form className="form-stack" onSubmit={submit} key={`${kind}-${step}`}>
      {kind === "register" && <><p className="muted">Para uma nova clínica. Para entrar em uma equipe existente, peça seu cadastro ao administrador.</p><label>Nome da clínica<input name="clinica" required minLength={2} maxLength={150}/></label><label>CNPJ (14 dígitos)<input name="cnpj" required pattern="[0-9]{14}" inputMode="numeric" maxLength={14}/></label><label>Seu nome<input name="nome" required minLength={2} maxLength={150} autoComplete="name"/></label><label>WhatsApp com DDD<input name="whatsapp" type="tel" required pattern="[0-9]{10,20}" maxLength={20}/></label><label>CREFITO (opcional)<input name="crefito" minLength={3} maxLength={30}/></label></>}
      {(kind === "register" || step === 0) && <label>E-mail<input name="email" type="email" required autoComplete="email"/></label>}
      {kind === "reset" && step === 1 && <><p className="muted">Se houver uma conta para {email}, enviaremos um código. Confira também o spam.</p><label>Código de 6 dígitos<input name="codigo" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code"/></label></>}
      {(kind === "register" || step === 2) && <><label>Senha (8 a 128 caracteres)<input name="senha" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label><label>Confirme a senha<input name="confirmacao" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label></>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? "Aguarde…" : kind === "register" ? "Criar clínica e conta" : step === 0 ? "Enviar código" : step === 1 ? "Verificar código" : "Salvar nova senha"}</button>
      {kind === "reset" && step === 1 && <button type="button" className="text-button" disabled={busy} onClick={() => {setStep(0); setError("");}}>Alterar e-mail ou reenviar</button>}
    </form>}
  </Modal>;
}
