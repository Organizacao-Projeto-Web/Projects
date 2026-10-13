async function carregarDashboard() {
  const token = localStorage.getItem("token");

  try {
    const [resPacientes, resAgendamentos] = await Promise.all([
      fetch(`${API_URL}/pacientes`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),

      fetch(`${API_URL}/agendamentos`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    ]);

    if (resPacientes.status === 401 || resAgendamentos.status === 401) {
      logout();
      return;
    }

    if (!resPacientes.ok || !resAgendamentos.ok) {
      throw new Error("Não foi possível carregar o dashboard.");
    }

    const pacientes = await resPacientes.json();
    const agendamentos = await resAgendamentos.json();

    const agora = new Date();

    const hoje = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, "0"),
      String(agora.getDate()).padStart(2, "0")
    ].join("-");

    const agendamentosHoje = agendamentos.filter((agendamento) => {
      const data = String(agendamento.data_hora).slice(0, 10);

      return (
        data === hoje &&
        agendamento.status !== "cancelado"
      );
    });

    const proximos = agendamentos.filter((agendamento) => {
      return (
        agendamento.status === "agendado" &&
        new Date(agendamento.data_hora) >= agora
      );
    });

    const realizados = agendamentos.filter((agendamento) => {
      return agendamento.status === "realizado";
    });

    document.getElementById("dashboard-total-pacientes").textContent =
      pacientes.length;

    document.getElementById("dashboard-agendamentos-hoje").textContent =
      agendamentosHoje.length;

    document.getElementById("dashboard-proximos").textContent =
      proximos.length;

    document.getElementById("dashboard-realizados").textContent =
      realizados.length;

  } catch (erro) {
    console.error("Erro ao carregar dashboard:", erro);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("nav-dashboard")
    ?.addEventListener("click", carregarDashboard);
});