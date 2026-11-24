export type Role = "admin" | "fisioterapeuta" | "recepcao";
export interface User {
  id: number;
  nome: string;
  email: string;
  cargo: Role;
  clinica_id: number;
  ativo: boolean;
  crefito: string | null;
}
export interface Patient {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  clinica_id: number;
  created_at: string;
}
export type PatientInput = Pick<
  Patient,
  "nome" | "cpf" | "telefone" | "data_nascimento"
>;
export interface Consultation {
  id: number;
  paciente_id: number;
  medico_id: number;
  queixa_principal: string;
  diagnostico: string | null;
  prescricao: string | null;
  observacoes: string | null;
  created_at: string;
}
export type ConsultationInput = Omit<
  Consultation,
  "id" | "medico_id" | "created_at"
>;

export interface UserInput {
  nome: string; email: string; whatsapp: string; senha: string;
  cargo: "fisioterapeuta" | "recepcao"; crefito: string | null;
}
export interface Registration {
  clinica: {nome: string; cnpj: string};
  responsavel: Omit<UserInput, "cargo">;
}
export type AppointmentStatus = "agendado" | "realizado" | "cancelado";
export interface AppointmentInput {
  paciente_id: number; profissional_id: number; data_hora: string;
  duracao_minutos: number; observacoes: string | null;
}
export interface Appointment extends AppointmentInput {
  id: number; clinica_id: number; status: AppointmentStatus; created_at: string;
}
