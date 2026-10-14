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

        renderizarAgendaHoje(agendamentosHoje, pacientes);

    } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);
    }
}

function renderizarAgendaHoje(agendamentosHoje, pacientes) {
    const container = document.getElementById(
        "dashboard-agenda-hoje-lista"
    );

    if (!container) return;

    container.replaceChildren();

    if (!agendamentosHoje || agendamentosHoje.length === 0) {
        const vazio = document.createElement("p");

        vazio.className = "text-sm text-slate-500";
        vazio.textContent = "Nenhum atendimento agendado para hoje.";

        container.appendChild(vazio);
        return;
    }

    const ordenados = [...agendamentosHoje].sort((a, b) => {
        return String(a.data_hora).localeCompare(String(b.data_hora));
    });

    ordenados.forEach((agendamento) => {
        const paciente = pacientes.find(
            (item) => Number(item.id) === Number(agendamento.paciente_id)
        );

        const card = document.createElement("div");

        card.className =
            "flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0";

        const esquerda = document.createElement("div");

        esquerda.className = "flex items-center gap-4 min-w-0";

        const horario = document.createElement("div");

        horario.className =
            "text-sm font-bold text-teal-700 min-w-[48px]";

        horario.textContent =
            String(agendamento.data_hora).slice(11, 16) || "--:--";

        const dados = document.createElement("div");

        dados.className = "min-w-0";

        const nome = document.createElement("p");

        nome.className =
            "text-sm font-semibold text-slate-800 truncate";

        nome.textContent =
            paciente?.nome || `Paciente #${agendamento.paciente_id}`;

        const duracao = document.createElement("p");

        duracao.className =
            "text-xs text-slate-500 mt-1";

        duracao.textContent =
            `${agendamento.duracao_minutos || 60} minutos`;

        dados.appendChild(nome);
        dados.appendChild(duracao);

        esquerda.appendChild(horario);
        esquerda.appendChild(dados);

        const status = document.createElement("span");

        status.className =
            "text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap";

        if (agendamento.status === "realizado") {
            status.classList.add(
                "bg-emerald-50",
                "text-emerald-700"
            );

            status.textContent = "Realizado";
        } else {
            status.classList.add(
                "bg-teal-50",
                "text-teal-700"
            );

            status.textContent = "Agendado";
        }

        card.appendChild(esquerda);
        card.appendChild(status);

        container.appendChild(card);
    });
}


document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("nav-dashboard")
        ?.addEventListener("click", carregarDashboard);
});