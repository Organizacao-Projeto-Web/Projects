let todosPacientes = [];

async function carregarPacientes() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/pacientes`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  todosPacientes = await res.json();
  renderizarListaPacientes(todosPacientes);
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
    li.innerHTML = `<div><strong>${p.nome}</strong><br><span class="text-xs text-gray-500">CPF: ${p.cpf || 'Não informado'}</span></div>`;
    lista.appendChild(li);
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
    cpf: document.getElementById("pac-cpf").value,
    telefone: document.getElementById("pac-telefone").value,
    data_nascimento: document.getElementById("pac-nascimento").value || null,
    clinica_id: 1
  };

  await fetch(`${API_URL}/pacientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body)
  });

  e.target.reset();
  carregarPacientes();
}