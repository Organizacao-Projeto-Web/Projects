async function registrarConsulta(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const pacienteId = document.getElementById("selected-paciente-id").value;

  if (!pacienteId) {
    alert("Selecione um paciente na lista primeiro.");
    return;
  }

  const body = {
    paciente_id: parseInt(pacienteId),
    queixa_principal: document.getElementById("queixa").value,
    diagnostico: document.getElementById("diagnostico").value,
    prescricao: document.getElementById("prescricao").value,
    observacoes: document.getElementById("observacoes").value
  };

  await fetch(`${API_URL}/consultas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body)
  });

  e.target.reset();
  carregarHistorico(pacienteId);
}

async function carregarHistorico(pacienteId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/consultas/paciente/${pacienteId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const consultas = await res.json();

  const container = document.getElementById("historico-consultas");
  container.innerHTML = "";

  if (!consultas || consultas.length === 0) {
    container.innerHTML = "<p class='text-sm text-gray-500'>Nenhuma sessão registrada para este paciente.</p>";
    return;
  }

  consultas.forEach(c => {
    const data = new Date(c.created_at).toLocaleDateString("pt-BR");
    const div = document.createElement("div");
    div.className = "border-l-4 border-teal-600 bg-gray-50 p-3 rounded text-sm space-y-1 mb-3";
    div.innerHTML = `
      <div class="text-xs font-bold text-teal-800">Sessão em: ${data}</div>
      <div><strong>Anamnese:</strong> ${c.queixa_principal}</div>
      <div><strong>Diagnóstico Cinesiológico:</strong> ${c.diagnostico || '-'}</div>
      <div><strong>Conduta / Exercícios:</strong> ${c.prescricao || '-'}</div>
      <div><strong>Evolução:</strong> ${c.observacoes || '-'}</div>
    `;
    container.appendChild(div);
  });
}