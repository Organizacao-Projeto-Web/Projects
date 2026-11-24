import type { Patient, User } from "./types";
export const demoUser: User = {
  id: 1,
  nome: "Marina Costa",
  email: "demo@example.com",
  cargo: "admin",
  clinica_id: 1,
  ativo: true,
  crefito: null,
};
export const demoPatients: Patient[] = [
  { id: 1, nome: "Ana Oliveira", data_nascimento: "1992-04-18" },
  { id: 2, nome: "Beatriz Santos", data_nascimento: "1985-09-02" },
  { id: 3, nome: "Carolina Lima", data_nascimento: "1998-11-23" },
  { id: 4, nome: "Daniela Ribeiro", data_nascimento: "1974-06-15" },
  { id: 5, nome: "Elisa Martins", data_nascimento: "1990-01-30" },
].map((p) => ({
  ...p,
  cpf: null,
  telefone: null,
  clinica_id: 1,
  created_at: "2026-11-03T12:00:00Z",
}));
