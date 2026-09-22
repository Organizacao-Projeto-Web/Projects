function alternarTelaAuth() {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");
  const title = document.getElementById("auth-subtitle");
  const btn = document.getElementById("toggle-auth-btn");
  
  limparMensagens();

  if (loginForm.classList.contains("hidden")) {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    title.innerText = "Acesse sua conta para continuar";
    btn.innerText = "Não tem uma conta? Cadastre-se";
  } else {
    loginForm.classList.add("hidden");
    regForm.classList.remove("hidden");
    title.innerText = "Crie sua conta profissional";
    btn.innerText = "Já tem uma conta? Faça Login";
  }
}

function limparMensagens() {
  document.getElementById("auth-error").classList.add("hidden");
  document.getElementById("auth-success").classList.add("hidden");
}

async function fazerLogin(e) {
  e.preventDefault();
  limparMensagens();

  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;

  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", senha);

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData
    });

    if (!res.ok) throw new Error("Usuário ou senha incorretos.");

    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    iniciarApp();
  } catch (err) {
    document.getElementById("auth-error").innerText = err.message;
    document.getElementById("auth-error").classList.remove("hidden");
  }
}

async function cadastrarFisioterapeuta(e) {
  e.preventDefault();
  limparMensagens();

  const body = {
    nome: document.getElementById("reg-nome").value,
    crefito: document.getElementById("reg-crefito").value,
    email: document.getElementById("reg-email").value,
    senha: document.getElementById("reg-senha").value
  };

  try {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Erro ao cadastrar conta.");
    }

    document.getElementById("auth-success").innerText = "Conta criada com sucesso! Faça login para entrar.";
    document.getElementById("auth-success").classList.remove("hidden");
    
    setTimeout(() => {
      alternarTelaAuth();
    }, 1500);

  } catch (err) {
    document.getElementById("auth-error").innerText = err.message;
    document.getElementById("auth-error").classList.remove("hidden");
  }
}

async function iniciarApp() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/usuarios/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const user = await res.json();

    document.getElementById("user-display").innerText = `${user.nome} (CREFITO: ${user.crefito || 'N/A'})`;
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");

    carregarPacientes();
  } catch {
    logout();
  }
}

function logout() {
  localStorage.removeItem("token");
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", iniciarApp);