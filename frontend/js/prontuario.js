async function registrarConsulta(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const pacienteId = document.getElementById("selected-paciente-id").value;

  if (!pacienteId) {
    alert("Selecione um paciente na lista primeiro.");
    return;
  }

  const dorSelecionada =
    document.querySelector('input[name="dor-atual"]:checked')?.value || null;

  const percepcaoSelecionada =
    document.querySelector('input[name="percepcao-paciente"]:checked')?.value || null;

  const body = {
    paciente_id: parseInt(pacienteId, 10),
    queixa_principal: document.getElementById("queixa").value,
    diagnostico: document.getElementById("diagnostico").value || null,
    prescricao: document.getElementById("prescricao").value || null,
    observacoes: document.getElementById("observacoes").value || null,

    dor_atual:
      dorSelecionada !== null
        ? parseInt(dorSelecionada, 10)
        : null,

    percepcao_paciente: percepcaoSelecionada
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

    consultas.forEach((c) => {
      const data = new Date(c.created_at).toLocaleDateString("pt-BR");

      const card = document.createElement("div");

      card.className =
        "border border-slate-200 rounded-xl bg-white overflow-hidden mb-3";

      // =========================
      // CABEÇALHO DA SESSÃO
      // =========================

      const cabecalho = document.createElement("button");

      cabecalho.type = "button";

      cabecalho.className =
        "w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 transition";

      const resumo = document.createElement("div");

      const titulo = document.createElement("p");

      titulo.className =
        "font-semibold text-slate-800";

      titulo.textContent = `Sessão em ${data}`;

      const indicadores = document.createElement("div");

      indicadores.className =
        "flex flex-wrap gap-2 mt-2";


      // DOR
      const dor = document.createElement("span");

      dor.className =
        "text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full";

      if (c.dor_atual !== null && c.dor_atual !== undefined) {
        dor.textContent = `Dor: ${c.dor_atual}/10`;
      } else {
        dor.textContent = "Dor não informada";
      }

      indicadores.appendChild(dor);


      // PERCEPÇÃO
      if (c.percepcao_paciente) {
        const percepcao = document.createElement("span");

        percepcao.className =
          "text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full";

        const textosPercepcao = {
          melhorou: "Melhorou",
          igual: "Permaneceu igual",
          piorou: "Piorou"
        };

        percepcao.textContent =
          textosPercepcao[c.percepcao_paciente] ||
          c.percepcao_paciente;

        indicadores.appendChild(percepcao);
      }

      resumo.appendChild(titulo);
      resumo.appendChild(indicadores);


      const textoExpandir = document.createElement("span");

      textoExpandir.className =
        "text-sm font-semibold text-teal-700 whitespace-nowrap";

      textoExpandir.textContent = "Ver detalhes";

      cabecalho.appendChild(resumo);
      cabecalho.appendChild(textoExpandir);


      // =========================
      // DETALHES DA SESSÃO
      // =========================

      const detalhes = document.createElement("div");

      detalhes.className =
        "hidden border-t border-slate-100 p-4 bg-slate-50 space-y-3 text-sm";


      function adicionarCampo(tituloCampo, valor) {
        const bloco = document.createElement("div");

        const titulo = document.createElement("p");

        titulo.className =
          "text-xs font-semibold text-slate-500 uppercase";

        titulo.textContent = tituloCampo;

        const conteudo = document.createElement("p");

        conteudo.className =
          "text-slate-800 mt-1 whitespace-pre-wrap";

        conteudo.textContent = valor || "Não informado";

        bloco.appendChild(titulo);
        bloco.appendChild(conteudo);

        detalhes.appendChild(bloco);
      }


      adicionarCampo(
        "Anamnese / Queixa Principal",
        c.queixa_principal
      );

      adicionarCampo(
        "Diagnóstico Cinesiológico Funcional",
        c.diagnostico
      );

      adicionarCampo(
        "Conduta / Exercícios Aplicados",
        c.prescricao
      );

      adicionarCampo(
        "Evolução / Observações",
        c.observacoes
      );


      // =========================
      // ABRIR / FECHAR
      // =========================

      cabecalho.addEventListener("click", () => {
        const fechado =
          detalhes.classList.contains("hidden");

        detalhes.classList.toggle("hidden");

        textoExpandir.textContent =
          fechado
            ? "Ocultar detalhes"
            : "Ver detalhes";
      });


      card.appendChild(cabecalho);
      card.appendChild(detalhes);

      container.appendChild(card);
    });

  } catch (err) {
    alert(err.message);
  }
}