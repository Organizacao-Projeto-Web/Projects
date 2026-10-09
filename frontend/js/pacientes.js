let todosPacientes = [];
let pacienteSelecionado = null;


async function carregarPacientes() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/pacientes`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        logout();
        return;
      }

      throw new Error("Não foi possível carregar os pacientes.");
    }

    todosPacientes = await res.json();

    renderizarListaPacientes(todosPacientes);

  } catch (err) {
    alert(err.message);
  }
}


function renderizarListaPacientes(pacientes) {
  const lista = document.getElementById("lista-pacientes");

  lista.replaceChildren();

  if (!pacientes || pacientes.length === 0) {
    const vazio = document.createElement("li");

    vazio.className =
      "py-4 text-sm text-slate-500 text-center";

    vazio.textContent = "Nenhum paciente encontrado.";

    lista.appendChild(vazio);
    return;
  }

  pacientes.forEach((paciente) => {
    const li = document.createElement("li");

    const selecionado =
      pacienteSelecionado &&
      pacienteSelecionado.id === paciente.id;

    li.className = [
      "py-3",
      "px-3",
      "rounded-lg",
      "cursor-pointer",
      "transition",
      "border",
      selecionado
        ? "bg-teal-50 border-teal-500"
        : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
    ].join(" ");

    li.addEventListener("click", () => {
      selecionarPaciente(paciente);
    });

    const topo = document.createElement("div");

    topo.className =
      "flex items-start justify-between gap-2";

    const dados = document.createElement("div");

    const nome = document.createElement("p");

    nome.className =
      "font-semibold text-slate-800";

    nome.textContent = paciente.nome;

    const detalhes = document.createElement("p");

    detalhes.className =
      "text-xs text-slate-500 mt-1";

    const cpf = paciente.cpf || "Não informado";

    detalhes.textContent =
      `ID #${paciente.id} • CPF: ${cpf}`;

    dados.appendChild(nome);
    dados.appendChild(detalhes);

    topo.appendChild(dados);

    if (selecionado) {
      const badge = document.createElement("span");

      badge.className =
        "text-xs bg-teal-600 text-white px-2 py-1 rounded-full";

      badge.textContent = "Selecionado";

      topo.appendChild(badge);
    }

    li.appendChild(topo);
    lista.appendChild(li);
  });
}


function normalizarTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .trim();
}


function somenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}


function filtrarPacientes() {
  const campo = document.getElementById("busca-paciente");

  const termo = normalizarTexto(campo.value);
  const termoNumerico = somenteNumeros(termo);

  if (!termo) {
    renderizarListaPacientes(todosPacientes);
    return;
  }

  const filtrados = todosPacientes.filter((paciente) => {
    const id = String(paciente.id);
    const nome = normalizarTexto(paciente.nome);
    const cpf = somenteNumeros(paciente.cpf);

    return (
      id.includes(termo) ||
      nome.includes(termo) ||
      (
        termoNumerico &&
        cpf.includes(termoNumerico)
      )
    );
  });

  renderizarListaPacientes(filtrados);
}


function selecionarPaciente(paciente) {
  pacienteSelecionado = paciente;

  document.getElementById(
    "selected-paciente-id"
  ).value = paciente.id;

  document.getElementById(
    "paciente-selecionado-info"
  ).textContent = `Paciente selecionado: ${paciente.nome}`;

  const painel = document.getElementById(
    "paciente-selecionado-card"
  );

  const nome = document.getElementById(
    "paciente-selecionado-nome"
  );

  const detalhes = document.getElementById(
    "paciente-selecionado-detalhes"
  );

  if (painel && nome && detalhes) {
    nome.textContent = paciente.nome;

    detalhes.textContent =
      `ID #${paciente.id} • CPF: ${
        paciente.cpf || "Não informado"
      }`;

    painel.classList.remove("hidden");
  }

  renderizarListaPacientes(
    filtrarPacientesSelecionados()
  );

  carregarHistorico(paciente.id);
}


function filtrarPacientesSelecionados() {
  const campo = document.getElementById("busca-paciente");

  const termo = normalizarTexto(campo.value);
  const termoNumerico = somenteNumeros(termo);

  if (!termo) {
    return todosPacientes;
  }

  return todosPacientes.filter((paciente) => {
    const id = String(paciente.id);
    const nome = normalizarTexto(paciente.nome);
    const cpf = somenteNumeros(paciente.cpf);

    return (
      id.includes(termo) ||
      nome.includes(termo) ||
      (
        termoNumerico &&
        cpf.includes(termoNumerico)
      )
    );
  });
}


function iniciarAtendimentoPaciente() {
  if (!pacienteSelecionado) {
    alert("Selecione um paciente primeiro.");
    return;
  }

  const areaAtendimento = document.getElementById(
    "area-novo-atendimento"
  );

  if (areaAtendimento) {
    areaAtendimento.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  const campoQueixa = document.getElementById("queixa");

  if (campoQueixa) {
    setTimeout(() => {
      campoQueixa.focus();
    }, 400);
  }
}


async function cadastrarPaciente(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");

  const body = {
    nome: document.getElementById("pac-nome").value.trim(),
    cpf: document.getElementById("pac-cpf").value.trim() || null,
    telefone:
      document.getElementById("pac-telefone").value.trim() || null,
    data_nascimento:
      document.getElementById("pac-nascimento").value || null
  };

  try {
    const res = await fetch(`${API_URL}/pacientes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      if (res.status === 401) {
        logout();
        return;
      }

      const erro = await res.json();

      throw new Error(
        typeof erro.detail === "string"
          ? erro.detail
          : "Não foi possível cadastrar o paciente."
      );
    }

    e.target.reset();

    await carregarPacientes();

  } catch (err) {
    alert(err.message);
  }
}

function alternarFormularioNovoPaciente() {
  const formulario = document.getElementById("form-novo-paciente");
  const botao = document.getElementById("btn-novo-paciente");

  if (!formulario || !botao) return;

  const estaFechado = formulario.classList.contains("hidden");

  formulario.classList.toggle("hidden");

  if (estaFechado) {
    botao.textContent = "Fechar";
    document.getElementById("pac-nome")?.focus();
  } else {
    botao.textContent = "+ Novo paciente";
  }
}