const telas = {
  dashboard: "tela-dashboard",
  pacientes: "tela-pacientes",
  agenda: "tela-agenda",
  atendimentos: "tela-atendimentos",
};

function mostrarTela(nomeTela) {
  Object.entries(telas).forEach(([nome, idTela]) => {
    const tela = document.getElementById(idTela);
    const botao = document.getElementById(`nav-${nome}`);

    if (!tela || !botao) return;

    const ativa = nome === nomeTela;

    tela.classList.toggle("hidden", !ativa);

    botao.classList.toggle("text-teal-700", ativa);
    botao.classList.toggle("border-teal-600", ativa);

    botao.classList.toggle("text-slate-600", !ativa);
    botao.classList.toggle("border-transparent", !ativa);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("nav-dashboard")
    ?.addEventListener("click", () => mostrarTela("dashboard"));

  document
    .getElementById("nav-pacientes")
    ?.addEventListener("click", () => mostrarTela("pacientes"));

  document
    .getElementById("nav-agenda")
    ?.addEventListener("click", () => mostrarTela("agenda"));

  document
    .getElementById("nav-atendimentos")
    ?.addEventListener("click", () => mostrarTela("atendimentos"));

  mostrarTela("agenda");
});