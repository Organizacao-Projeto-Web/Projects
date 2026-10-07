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
    diagnostico: document.getElementById("diagnostico").value || null,
    prescricao: document.getElementById("prescricao").value || null,
    observacoes: document.getElementById("observacoes").value || null
  };

  try {
    const res = await fetch(`${API_URL}/consultas`, {
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
          : "Não foi possível registrar a consulta."
      );
    }

    e.target.reset();
    await carregarHistorico(pacienteId);

  } catch (err) {
    alert(err.message);
  }
}

async function carregarHistorico(pacienteId) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/consultas/paciente/${pacienteId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        logout();
        return;
      }

      const erro = await res.json();

      throw new Error("Não foi possível carregar o histórico do paciente.");
    }

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
      const linhaData = document.createElement("div");
      linhaData.className = "text-xs font-bold text-teal-800";
      linhaData.textContent = `Sessão em: ${data}`;

      const linhaAnamnese = document.createElement("div");
      const tituloAnamnese = document.createElement("strong");
      tituloAnamnese.textContent = "Anamnese: ";
      linhaAnamnese.appendChild(tituloAnamnese);
      linhaAnamnese.appendChild(
        document.createTextNode(c.queixa_principal || "-")
      );

      const linhaDiagnostico = document.createElement("div");
      const tituloDiagnostico = document.createElement("strong");
      tituloDiagnostico.textContent = "Diagnóstico Cinesiológico: ";
      linhaDiagnostico.appendChild(tituloDiagnostico);
      linhaDiagnostico.appendChild(
        document.createTextNode(c.diagnostico || "-")
      );

      const linhaPrescricao = document.createElement("div");
      const tituloPrescricao = document.createElement("strong");
      tituloPrescricao.textContent = "Conduta / Exercícios: ";
      linhaPrescricao.appendChild(tituloPrescricao);
      linhaPrescricao.appendChild(
        document.createTextNode(c.prescricao || "-")
      );

      const linhaObservacoes = document.createElement("div");
      const tituloObservacoes = document.createElement("strong");
      tituloObservacoes.textContent = "Evolução: ";
      linhaObservacoes.appendChild(tituloObservacoes);
      linhaObservacoes.appendChild(
        document.createTextNode(c.observacoes || "-")
      );

      div.appendChild(linhaData);
      div.appendChild(linhaAnamnese);
      div.appendChild(linhaDiagnostico);
      div.appendChild(linhaPrescricao);
      div.appendChild(linhaObservacoes);
      container.appendChild(div);
    });

  } catch (err) {
    alert(err.message);
  }
}