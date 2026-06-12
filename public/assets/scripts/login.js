// ===== AUTH / LOGIN MODULE =====
const API = 'http://localhost:3000';

// --- Session helpers ---
function getUsuarioLogado() {
  const raw = sessionStorage.getItem('usuarioLogado');
  return raw ? JSON.parse(raw) : null;
}
function setUsuarioLogado(u) {
  sessionStorage.setItem('usuarioLogado', JSON.stringify(u));
}
function logout() {
  sessionStorage.removeItem('usuarioLogado');
  window.location.href = 'index.html';
}

// --- Update navbar based on session ---
function atualizarNavbar() {
  const u = getUsuarioLogado();
  const navLogin = document.getElementById('nav-login-item');
  const navLogout = document.getElementById('nav-logout-item');
  const navFav = document.getElementById('nav-fav-item');
  const navCadastroItens = document.getElementById('nav-cadastro-itens');

  if (u) {
    if (navLogin) navLogin.style.display = 'none';
    if (navLogout) { navLogout.style.display = ''; navLogout.querySelector('span') && (navLogout.querySelector('span').textContent = u.nome.split(' ')[0]); }
    if (navFav) navFav.style.display = '';
    if (navCadastroItens) navCadastroItens.style.display = u.admin ? '' : 'none';
  } else {
    if (navLogin) navLogin.style.display = '';
    if (navLogout) navLogout.style.display = 'none';
    if (navFav) navFav.style.display = 'none';
    if (navCadastroItens) navCadastroItens.style.display = 'none';
  }
}

// --- Login form handler ---
async function handleLogin(e) {
  e.preventDefault();
  const loginVal = document.getElementById('input-login').value.trim();
  const senhaVal = document.getElementById('input-senha').value.trim();
  const errDiv = document.getElementById('login-erro');

  try {
    const res = await fetch(`${API}/usuarios?login=${encodeURIComponent(loginVal)}&senha=${encodeURIComponent(senhaVal)}`);
    const lista = await res.json();
    if (lista.length > 0) {
      setUsuarioLogado(lista[0]);
      // close modal if exists
      const modalEl = document.getElementById('modalLogin');
      if (modalEl) {
        const m = bootstrap.Modal.getInstance(modalEl);
        if (m) m.hide();
      }
      atualizarNavbar();
      mostrarToast(`Bem-vindo, ${lista[0].nome.split(' ')[0]}! 👋`);
      // Reload cards to show hearts
      if (typeof renderizarCards === 'function') renderizarCards();
    } else {
      if (errDiv) { errDiv.textContent = 'Login ou senha incorretos.'; errDiv.style.display = 'block'; }
    }
  } catch (err) {
    if (errDiv) { errDiv.textContent = 'Erro ao conectar ao servidor.'; errDiv.style.display = 'block'; }
  }
}

// --- Register form handler ---
async function handleCadastroUsuario(e) {
  e.preventDefault();
  const login = document.getElementById('reg-login').value.trim();
  const nome = document.getElementById('reg-nome').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const senha = document.getElementById('reg-senha').value.trim();
  const errDiv = document.getElementById('reg-erro');

  if (!login || !nome || !email || !senha) {
    if (errDiv) { errDiv.textContent = 'Preencha todos os campos.'; errDiv.style.display = 'block'; }
    return;
  }

  // Check duplicate login
  try {
    const check = await fetch(`${API}/usuarios?login=${encodeURIComponent(login)}`);
    const existe = await check.json();
    if (existe.length > 0) {
      if (errDiv) { errDiv.textContent = 'Este login já está em uso.'; errDiv.style.display = 'block'; }
      return;
    }

    const novoUsuario = { id: crypto.randomUUID(), login, senha, nome, email, admin: false };
    const res = await fetch(`${API}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoUsuario)
    });
    if (res.ok) {
      setUsuarioLogado(novoUsuario);
      const modalEl = document.getElementById('modalLogin');
      if (modalEl) { const m = bootstrap.Modal.getInstance(modalEl); if (m) m.hide(); }
      atualizarNavbar();
      mostrarToast(`Conta criada! Bem-vindo(a), ${nome.split(' ')[0]}! 🎉`);
      if (typeof renderizarCards === 'function') renderizarCards();
    }
  } catch (err) {
    if (errDiv) { errDiv.textContent = 'Erro ao cadastrar. Tente novamente.'; errDiv.style.display = 'block'; }
  }
}

// --- Toast ---
function mostrarToast(msg, tipo = 'success') {
  let container = document.getElementById('wt-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'wt-toast-container';
    container.className = 'wt-toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${tipo} border-0 show mb-2`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Expose globally
window.getUsuarioLogado = getUsuarioLogado;
window.setUsuarioLogado = setUsuarioLogado;
window.logout = logout;
window.atualizarNavbar = atualizarNavbar;
window.mostrarToast = mostrarToast;
window.handleLogin = handleLogin;
window.handleCadastroUsuario = handleCadastroUsuario;
window.API = API;
