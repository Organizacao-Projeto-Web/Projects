import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Search } from "lucide-react";
import type { Patient } from "../lib/types";
import { date, initials } from "../components/Shared";

export function Patients({
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
