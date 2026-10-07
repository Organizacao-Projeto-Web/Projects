let agendaPacientes = [];
let agendaProfissionais = [];


function mostrarMensagemAgenda(mensagem, tipo = "erro") {
  const elemento = document.getElementById("agenda-mensagem");

  elemento.textContent = mensagem;
  elemento.classList.remove(
    "hidden",
    "bg-red-50",
    "text-red-700",
    "bg-green-50",
    "text-green-700"
  );

  if (tipo === "sucesso") {
    elemento.classList.add("bg-green-50", "text-green-700");
  } else {
    elemento.classList.add("bg-red-50", "text-red-700");
  }
}


function esconderMensagemAgenda() {
  const elemento = document.getElementById("agenda-mensagem");

  if (!elemento) return;

  elemento.textContent = "";
  elemento.classList.add("hidden");
}


function tratarNaoAutorizadoAgenda(response) {
  if (response.status === 401) {
    logout();
    return true;
  }

  return false;
}


async function carregarDadosAgenda() {
  await Promise.all([
    carregarPacientesAgenda(),
    carregarProfissionaisAgenda(),
    carregarAgendamentos()
  ]);
}


async function carregarPacientesAgenda() {
  try {
    const response = await fetch(`${API_URL}/pacientes`, {
      headers: getAuthHeaders()
    });

    if (tratarNaoAutorizadoAgenda(response)) return;

    if (!response.ok) {
      throw new Error("Não foi possível carregar os pacientes.");
    }

    agendaPacientes = await response.json();

    const select = document.getElementById("agenda-paciente");

    select.replaceChildren();

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione um paciente";
    select.appendChild(opcaoInicial);

    agendaPacientes.forEach((paciente) => {
      const option = document.createElement("option");

      option.value = paciente.id;
      option.textContent = paciente.nome;

      select.appendChild(option);
    });
  } catch (erro) {
    mostrarMensagemAgenda(erro.message);
  }
}


async function carregarProfissionaisAgenda() {
  try {
    const response = await fetch(
      `${API_URL}/usuarios/profissionais`,
      {
        headers: getAuthHeaders()
      }
    );

    if (tratarNaoAutorizadoAgenda(response)) return;

    if (!response.ok) {
      throw new Error(
        "Não foi possível carregar os profissionais."
      );
    }

    agendaProfissionais = await response.json();

    const select = document.getElementById("agenda-profissional");

    select.replaceChildren();

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione um profissional";
    select.appendChild(opcaoInicial);

    agendaProfissionais.forEach((profissional) => {
      const option = document.createElement("option");

      option.value = profissional.id;
      option.textContent = profissional.nome;

      select.appendChild(option);
    });

    if (agendaProfissionais.length === 1) {
      select.value = agendaProfissionais[0].id;
    }
  } catch (erro) {
    mostrarMensagemAgenda(erro.message);
  }
}


async function criarAgendamento(event) {
  event.preventDefault();
  esconderMensagemAgenda();

  const pacienteId = Number(
    document.getElementById("agenda-paciente").value
  );

  const profissionalId = Number(
    document.getElementById("agenda-profissional").value
  );

  const dataHora = document.getElementById(
    "agenda-data-hora"
  ).value;

  const duracao = Number(
    document.getElementById("agenda-duracao").value
  );

  const observacoes = document.getElementById(
    "agenda-observacoes"
  ).value.trim();

  if (!pacienteId || !profissionalId || !dataHora) {
    mostrarMensagemAgenda(
      "Preencha paciente, profissional e horário."
    );
    return;
  }

  const body = {
    paciente_id: pacienteId,
    profissional_id: profissionalId,
    data_hora: dataHora,
    duracao_minutos: duracao,
    observacoes: observacoes || null
  };

  try {
    const response = await fetch(`${API_URL}/agendamentos`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    if (tratarNaoAutorizadoAgenda(response)) return;

    if (!response.ok) {
      const dadosErro = await response.json();

      let mensagem = "Não foi possível criar o agendamento.";

      if (typeof dadosErro.detail === "string") {
        mensagem = dadosErro.detail;
      }

      throw new Error(mensagem);
    }

    document.getElementById("agenda-data-hora").value = "";
    document.getElementById("agenda-observacoes").value = "";

    mostrarMensagemAgenda(
      "Agendamento criado com sucesso.",
      "sucesso"
    );

    await carregarAgendamentos();
  } catch (erro) {
    mostrarMensagemAgenda(erro.message);
  }
}


function obterNomePaciente(pacienteId) {
  const paciente = agendaPacientes.find(
    (item) => item.id === pacienteId
  );

  return paciente ? paciente.nome : `Paciente #${pacienteId}`;
}


function obterNomeProfissional(profissionalId) {
  const profissional = agendaProfissionais.find(
    (item) => item.id === profissionalId
  );

  return profissional
    ? profissional.nome
    : `Profissional #${profissionalId}`;
}


function formatarDataHoraAgenda(valor) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}


function criarBotaoStatus(agendamento, status, texto) {
  const botao = document.createElement("button");

  botao.type = "button";
  botao.textContent = texto;
  botao.className =
    "text-xs px-2 py-1 rounded border hover:bg-slate-100 transition";

  botao.addEventListener("click", () => {
    atualizarStatusAgendamento(agendamento.id, status);
  });

  return botao;
}


async function carregarAgendamentos() {
  const container = document.getElementById(
    "lista-agendamentos"
  );

  if (!container) return;

  container.replaceChildren();

  const carregando = document.createElement("p");
  carregando.className = "text-sm text-slate-500";
  carregando.textContent = "Carregando agenda...";
  container.appendChild(carregando);

  try {
    const response = await fetch(`${API_URL}/agendamentos`, {
      headers: getAuthHeaders()
    });

    if (tratarNaoAutorizadoAgenda(response)) return;

    if (!response.ok) {
      throw new Error("Não foi possível carregar a agenda.");
    }

    const agendamentos = await response.json();

    container.replaceChildren();

    if (agendamentos.length === 0) {
      const vazio = document.createElement("p");

      vazio.className = "text-sm text-slate-500";
      vazio.textContent = "Nenhum agendamento encontrado.";

      container.appendChild(vazio);
      return;
    }

    agendamentos.forEach((agendamento) => {
      const card = document.createElement("div");

      card.className =
        "border border-slate-200 rounded-lg p-3";

      const topo = document.createElement("div");
      topo.className =
        "flex flex-col sm:flex-row sm:justify-between gap-2";

      const dados = document.createElement("div");

      const paciente = document.createElement("p");
      paciente.className = "font-semibold text-slate-800";
      paciente.textContent = obterNomePaciente(
        agendamento.paciente_id
      );

      const profissional = document.createElement("p");
      profissional.className = "text-sm text-slate-600";
      profissional.textContent =
        `Profissional: ${obterNomeProfissional(
          agendamento.profissional_id
        )}`;

      const horario = document.createElement("p");
      horario.className = "text-sm text-slate-600";
      horario.textContent =
        `${formatarDataHoraAgenda(
          agendamento.data_hora
        )} · ${agendamento.duracao_minutos} min`;

      dados.appendChild(paciente);
      dados.appendChild(profissional);
      dados.appendChild(horario);

      const status = document.createElement("span");
      status.className =
        "text-xs font-semibold px-2 py-1 rounded bg-slate-100 self-start";
      status.textContent = agendamento.status;

      topo.appendChild(dados);
      topo.appendChild(status);

      card.appendChild(topo);

      if (agendamento.observacoes) {
        const observacoes = document.createElement("p");

        observacoes.className =
          "text-sm text-slate-500 mt-2";
        observacoes.textContent = agendamento.observacoes;

        card.appendChild(observacoes);
      }

      if (agendamento.status === "agendado") {
        const acoes = document.createElement("div");

        acoes.className = "flex gap-2 mt-3";

        acoes.appendChild(
          criarBotaoStatus(
            agendamento,
            "realizado",
            "Marcar realizado"
          )
        );

        acoes.appendChild(
          criarBotaoStatus(
            agendamento,
            "cancelado",
            "Cancelar"
          )
        );

        card.appendChild(acoes);
      }

      container.appendChild(card);
    });
  } catch (erro) {
    container.replaceChildren();

    const mensagem = document.createElement("p");
    mensagem.className = "text-sm text-red-600";
    mensagem.textContent = erro.message;

    container.appendChild(mensagem);
  }
}


async function atualizarStatusAgendamento(
  agendamentoId,
  novoStatus
) {
  try {
    const response = await fetch(
      `${API_URL}/agendamentos/${agendamentoId}/status`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: novoStatus
        })
      }
    );

    if (tratarNaoAutorizadoAgenda(response)) return;

    if (!response.ok) {
      const dadosErro = await response.json();

      let mensagem =
        "Não foi possível alterar o agendamento.";

      if (typeof dadosErro.detail === "string") {
        mensagem = dadosErro.detail;
      }

      throw new Error(mensagem);
    }

    await carregarAgendamentos();
  } catch (erro) {
    mostrarMensagemAgenda(erro.message);
  }
}