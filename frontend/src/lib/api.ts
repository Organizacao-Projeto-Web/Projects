import type {
  Consultation,
  ConsultationInput,
  Patient,
  PatientInput,
  User, UserInput, Registration, Appointment, AppointmentInput, AppointmentStatus,
} from "./types";
const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
// Token somente em memória: recarregar a página exige novo login.
let token: string | null = null;
export function clearSession() {
  token = null;
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!base) throw new ApiError("Configure VITE_API_URL em frontend/.env.local e reinicie o Vite.", 0);
  const requestToken = token;
  const headers = new Headers(init.headers);
  if (requestToken) headers.set("Authorization", `Bearer ${requestToken}`);
  if (init.body && !(init.body instanceof URLSearchParams))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API. Confira se o backend está rodando e se a URL e o CORS estão configurados.",
      0,
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && requestToken && token === requestToken) {
      clearSession();
      window.dispatchEvent(new Event("reab:expired"));
    }
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map(
                (item: { loc?: string[]; msg?: string }) =>
                  `${item.loc?.slice(1).join(".") || "Campo"}: ${item.msg || "valor inválido"}`,
              )
              .join("; ")
          : "Não foi possível concluir a operação.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}
export const api = {
  professionals: () => request<User[]>("/usuarios/profissionais"),
  createUser: (data: UserInput) => request<User>("/usuarios", {method: "POST", body: JSON.stringify(data)}),
  register: (data: Registration) => request("/cadastro", {method: "POST", body: JSON.stringify(data)}),
  requestReset: (email: string) => request<{mensagem: string}>("/auth/recuperacao-senha/solicitar", {method: "POST", body: JSON.stringify({email})}),
  verifyReset: (email: string, codigo: string) => request<{reset_token: string}>("/auth/recuperacao-senha/verificar", {method: "POST", body: JSON.stringify({email, codigo})}),
  resetPassword: (reset_token: string, nova_senha: string) => request("/auth/recuperacao-senha/redefinir", {method: "POST", body: JSON.stringify({reset_token, nova_senha})}),
  appointments: () => request<Appointment[]>("/agendamentos"),
  createAppointment: (data: AppointmentInput) => request<Appointment>("/agendamentos", {method: "POST", body: JSON.stringify(data)}),
  appointmentStatus: (id: number, status: AppointmentStatus) => request<Appointment>(`/agendamentos/${id}/status`, {method: "PATCH", body: JSON.stringify({status})}),
  async login(email: string, password: string) {
    clearSession();
    const result = await request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: new URLSearchParams({ username: email, password }),
    });
    token = result.access_token;
    try {
      return await request<User>("/usuarios/me");
    } catch (error) {
      clearSession();
      throw error;
    }
  },
  patients: () => request<Patient[]>("/pacientes"),
  createPatient: (data: PatientInput) =>
    request<Patient>("/pacientes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePatient: (id: number, data: PatientInput) =>
    request<Patient>(`/pacientes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  history: (id: number) => request<Consultation[]>(`/consultas/paciente/${id}`),
  createConsultation: (data: ConsultationInput) =>
    request<Consultation>("/consultas", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
