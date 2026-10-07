let todosPacientes = [];

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
  lista.innerHTML = "";

  if (!pacientes || pacientes.length === 0) {
    lista.innerHTML = "<li class='py-2 text-xs text-gray-500 text-center'>Nenhum paciente encontrado</li>";
    return;
  }

  pacientes.forEach(p => {
    const li = document.createElement("li");
    li.className = "py-2 cursor-pointer hover:bg-teal-50 px-2 rounded text-sm flex justify-between items-center transition";
    li.onclick = () => selecionarPaciente(p);
    const div = document.createElement("div");

    const strong = document.createElement("strong");
    strong.textContent = p.nome;

    const br = document.createElement("br");

    const span = document.createElement("span");
    span.className = "text-xs text-gray-500";
    span.textContent = `CPF: ${p.cpf || "Não informado"}`;

    div.appendChild(strong);
    div.appendChild(br);
    div.appendChild(span);

    li.appendChild(div);
  });
}

function filtrarPacientes() {
  const termo = document.getElementById("busca-paciente").value.toLowerCase();
  const filtrados = todosPacientes.filter(p =>
    p.nome.toLowerCase().includes(termo) || (p.cpf && p.cpf.includes(termo))
  );
  renderizarListaPacientes(filtrados);
}

function selecionarPaciente(paciente) {
  document.getElementById("selected-paciente-id").value = paciente.id;
  document.getElementById("paciente-selecionado-info").innerText = `Paciente Ativo: ${paciente.nome}`;
  carregarHistorico(paciente.id);
}

async function cadastrarPaciente(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");

  const body = {
    nome: document.getElementById("pac-nome").value,
    cpf: document.getElementById("pac-cpf").value || null,
    telefone: document.getElementById("pac-telefone").value || null,
    data_nascimento: document.getElementById("pac-nascimento").value || null
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