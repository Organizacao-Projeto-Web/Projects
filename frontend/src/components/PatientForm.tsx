import { useState } from "react";
import type { FormEvent } from "react";
import type { Patient, PatientInput } from "../lib/types";
import { Modal } from "./Modal";
export function PatientForm({
  patient,
  onSave,
  onClose,
}: {
  patient?: Patient;
  onSave: (data: PatientInput) => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nome = String(form.get("nome")).trim();
    const cpf = String(form.get("cpf")).replace(/\D/g, "") || null;
    const telefone = String(form.get("telefone")).replace(/\D/g, "") || null;
    if (
      nome.length < 2 ||
      (cpf && cpf.length !== 11) ||
      (telefone && (telefone.length < 10 || telefone.length > 15))
    ) {
      setError(
        "Confira o nome, o CPF (11 dígitos) e o telefone (10 a 15 dígitos).",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        nome,
        cpf,
        telefone,
        data_nascimento: String(form.get("data_nascimento")) || null,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={patient ? "Editar paciente" : "Nova paciente"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="form-stack">
        <p className="muted">
          Comece com os dados cadastrais. Campos com * são obrigatórios.
        </p>
        <label>
          Nome completo *
          <input
            autoFocus
            name="nome"
            defaultValue={patient?.nome}
            required
            minLength={2}
            maxLength={150}
            autoComplete="off"
            placeholder="Nome da paciente"
          />
        </label>
        <div className="form-grid">
          <label>
            CPF
            <input
              name="cpf"
              defaultValue={patient?.cpf || ""}
              inputMode="numeric"
              maxLength={14}
              placeholder="Somente números"
            />
          </label>
          <label>
            Data de nascimento
            <input
              type="date"
              name="data_nascimento"
              defaultValue={patient?.data_nascimento || ""}
            />
          </label>
        </div>
        <label>
          Telefone
          <input
            name="telefone"
            type="tel"
            defaultValue={patient?.telefone || ""}
            maxLength={22}
            placeholder="DDD + número"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar paciente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
