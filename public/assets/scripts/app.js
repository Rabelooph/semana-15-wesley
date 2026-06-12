// ===== APP.JS — WonderTrail TP2 =====

// ---- Carousel ----
async function renderizarCarrossel() {
  const container = document.getElementById('carrossel-container');
  if (!container) return;

  const res = await fetch(`${API}/lugares?destaque=true`);
  const destaques = await res.json();

  const indicadores = destaques.map((lugar, i) =>
    `<button type="button" data-bs-target="#carroselDestaques" data-bs-slide-to="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>`
  ).join('');

  const slides = destaques.map((lugar, i) => `
    <div class="carousel-item ${i === 0 ? 'active' : ''}">
      <div class="wt-carousel-slide" style="background-image: url('${lugar.imagem_pincipal}');">
        <div class="wt-carousel-overlay"></div>
        <div class="wt-carousel-content container text-white">
          <span class="wt-tag wt-tag-light mb-2 d-inline-block">${lugar.pais}</span>
          <h2 class="wt-carousel-nome">${lugar.nome}</h2>
          <p class="wt-carousel-desc">${lugar.descricao}</p>
          <a href="detalhes.html?id=${lugar.id}" class="btn wt-btn-slide mt-2">Explorar <i class="bi bi-arrow-right ms-1"></i></a>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div id="carroselDestaques" class="carousel slide wt-carousel" data-bs-ride="carousel" data-bs-interval="5000">
      <div class="carousel-indicators">${indicadores}</div>
      <div class="carousel-inner">${slides}</div>
      <button class="carousel-control-prev" type="button" data-bs-target="#carroselDestaques" data-bs-slide="prev">
        <span class="carousel-control-prev-icon"></span><span class="visually-hidden">Anterior</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#carroselDestaques" data-bs-slide="next">
        <span class="carousel-control-next-icon"></span><span class="visually-hidden">Próximo</span>
      </button>
    </div>`;
}

// ---- Cards ----
async function renderizarCards(filtro = '') {
  const container = document.getElementById('cards-container');
  if (!container) return;

  let url = `${API}/lugares`;
  const res = await fetch(url);
  let lugares = await res.json();

  if (filtro) {
    const q = filtro.toLowerCase();
    lugares = lugares.filter(l => l.nome.toLowerCase().includes(q) || l.descricao.toLowerCase().includes(q));
  }

  const u = getUsuarioLogado();
  let favIds = [];
  if (u) {
    const favRes = await fetch(`${API}/favoritos?usuarioId=${u.id}`);
    const favs = await favRes.json();
    favIds = favs.map(f => f.lugarId);
  }

  if (lugares.length === 0) {
    container.innerHTML = `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-search fs-1 d-block mb-3"></i>Nenhum destino encontrado.</div>`;
    return;
  }

  container.innerHTML = lugares.map(lugar => {
    const isFav = favIds.includes(lugar.id);
    const heartIcon = u ? `
      <button class="wt-fav-btn" onclick="toggleFavorito(${lugar.id}, this)" title="${isFav ? 'Remover favorito' : 'Adicionar favorito'}">
        <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
      </button>` : '';
    return `
    <div class="col-sm-6 col-lg-4">
      <div class="wt-card h-100">
        <div class="wt-card-img-wrapper">
          <img src="${lugar.imagem_pincipal}" alt="${lugar.nome}" class="wt-card-img" loading="lazy">
          ${lugar.destaque ? `<span class="wt-card-badge"><i class="bi bi-star-fill me-1"></i>Destaque</span>` : ''}
          ${heartIcon}
        </div>
        <div class="wt-card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h3 class="wt-card-nome">${lugar.nome}</h3>
            <span class="wt-card-pais"><i class="bi bi-geo-alt-fill me-1"></i>${lugar.pais}</span>
          </div>
          <p class="wt-card-desc">${lugar.descricao}</p>
          <div class="mt-auto pt-3">
            <a href="detalhes.html?id=${lugar.id}" class="btn wt-btn-card w-100 mt-2">Ver Detalhes <i class="bi bi-arrow-right ms-1"></i></a>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ---- Toggle favorito ----
async function toggleFavorito(lugarId, btn) {
  const u = getUsuarioLogado();
  if (!u) { mostrarToast('Faça login para favoritar!', 'warning'); return; }

  const res = await fetch(`${API}/favoritos?usuarioId=${u.id}&lugarId=${lugarId}`);
  const favs = await res.json();

  if (favs.length > 0) {
    await fetch(`${API}/favoritos/${favs[0].id}`, { method: 'DELETE' });
    btn.innerHTML = `<i class="bi bi-heart"></i>`;
    btn.title = 'Adicionar favorito';
    mostrarToast('Removido dos favoritos', 'secondary');
  } else {
    await fetch(`${API}/favoritos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: crypto.randomUUID(), usuarioId: u.id, lugarId })
    });
    btn.innerHTML = `<i class="bi bi-heart-fill"></i>`;
    btn.title = 'Remover favorito';
    mostrarToast('Adicionado aos favoritos ❤️');
  }
}

// ---- Map (Leaflet) ----
async function renderizarMapa() {
  const mapDiv = document.getElementById('map');
  if (!mapDiv) return;

  const res = await fetch(`${API}/lugares`);
  const lugares = await res.json();

  const map = L.map('map').setView([20, 10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  lugares.forEach(lugar => {
    if (lugar.latitude && lugar.longitude) {
      const marker = L.marker([lugar.latitude, lugar.longitude]).addTo(map);
      marker.bindPopup(`
        <div style="min-width:160px">
          <img src="${lugar.imagem_pincipal}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px">
          <strong>${lugar.nome}</strong><br>
          <small>${lugar.pais}</small><br>
          <a href="detalhes.html?id=${lugar.id}" style="font-size:.8rem">Ver detalhes →</a>
        </div>`);
    }
  });
}

// ---- Detalhes ----
async function renderizarDetalhes() {
  const detalhesContainer = document.getElementById('detalhes-container');
  const atracoesContainer = document.getElementById('atracoes-container');
  if (!detalhesContainer) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  if (!id) { exibirErroDestino(detalhesContainer, atracoesContainer); return; }

  const res = await fetch(`${API}/lugares/${id}`);
  if (!res.ok) { exibirErroDestino(detalhesContainer, atracoesContainer); return; }
  const lugar = await res.json();

  document.title = `WonderTrail — ${lugar.nome}`;

  // Check fav
  const u = getUsuarioLogado();
  let isFav = false;
  if (u) {
    const favRes = await fetch(`${API}/favoritos?usuarioId=${u.id}&lugarId=${lugar.id}`);
    const favs = await favRes.json();
    isFav = favs.length > 0;
  }

  const favBtn = u ? `
    <button class="wt-detail-fav-btn ${isFav ? 'active' : ''}" id="detalhe-fav-btn" onclick="toggleFavoritoDetalhe(${lugar.id})">
      <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'} me-1"></i>${isFav ? 'Favoritado' : 'Favoritar'}
    </button>` : '';

  detalhesContainer.innerHTML = `
    <section class="wt-detalhe-hero" style="background-image: url('${lugar.imagem_pincipal}');">
      <div class="wt-detalhe-overlay"></div>
      <div class="container wt-detalhe-hero-content text-white">
        <span class="wt-tag wt-tag-light mb-3 d-inline-block"><i class="bi bi-geo-alt-fill me-1"></i>${lugar.pais}</span>
        <h1 class="wt-detalhe-nome">${lugar.nome}</h1>
        <p class="wt-detalhe-descricao-curta">${lugar.descricao}</p>
        <div class="d-flex gap-3 align-items-center mt-3 flex-wrap">
          ${favBtn}
          <small class="wt-detalhe-data"><i class="bi bi-calendar3 me-1"></i>Adicionado em ${formatarData(lugar.data)}</small>
        </div>
      </div>
    </section>
    <section class="py-5 wt-detalhe-corpo">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="wt-detalhe-content-box p-4 p-md-5">
              <h2 class="wt-detalhe-subtitulo mb-3">Sobre ${lugar.nome}</h2>
              <p class="wt-detalhe-conteudo">${lugar.conteudo}</p>
              <hr class="wt-divider my-4">
              <div class="d-flex flex-wrap gap-3">
                <div class="wt-meta-item"><i class="bi bi-flag me-2"></i><strong>País:</strong> ${lugar.pais}</div>
                <div class="wt-meta-item"><i class="bi bi-globe me-2"></i><strong>Continente:</strong> ${lugar.continente || '-'}</div>
                <div class="wt-meta-item"><i class="bi bi-calendar me-2"></i><strong>Data:</strong> ${formatarData(lugar.data)}</div>
                <div class="wt-meta-item">${lugar.destaque ? '<i class="bi bi-star-fill me-2 text-warning"></i><strong>Destaque</strong>' : '<i class="bi bi-star me-2"></i>Destino'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  if (atracoesContainer && lugar.atracoes) {
    atracoesContainer.innerHTML = `
      <section class="py-5 wt-section-atracoes">
        <div class="container">
          <div class="wt-section-header mb-4">
            <span class="wt-tag">O que visitar</span>
            <h2 class="wt-section-title">Principais Atrações</h2>
            <p class="wt-section-sub">Não perca esses pontos imperdíveis em ${lugar.nome}.</p>
          </div>
          <div class="row g-4">
            ${lugar.atracoes.map(a => `
              <div class="col-sm-6 col-lg-4">
                <div class="wt-atracao-card h-100">
                  <div class="wt-atracao-img-wrapper">
                    <img src="${a.imagem}" alt="${a.nome}" class="wt-atracao-img" loading="lazy">
                  </div>
                  <div class="wt-atracao-body">
                    <h4 class="wt-atracao-nome">${a.nome}</h4>
                    <p class="wt-atracao-desc">${a.descricao}</p>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </section>`;
  }
}

async function toggleFavoritoDetalhe(lugarId) {
  const u = getUsuarioLogado();
  if (!u) return;
  const res = await fetch(`${API}/favoritos?usuarioId=${u.id}&lugarId=${lugarId}`);
  const favs = await res.json();
  const btn = document.getElementById('detalhe-fav-btn');
  if (favs.length > 0) {
    await fetch(`${API}/favoritos/${favs[0].id}`, { method: 'DELETE' });
    btn.classList.remove('active');
    btn.innerHTML = `<i class="bi bi-heart me-1"></i>Favoritar`;
    mostrarToast('Removido dos favoritos', 'secondary');
  } else {
    await fetch(`${API}/favoritos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: crypto.randomUUID(), usuarioId: u.id, lugarId })
    });
    btn.classList.add('active');
    btn.innerHTML = `<i class="bi bi-heart-fill me-1"></i>Favoritado`;
    mostrarToast('Adicionado aos favoritos ❤️');
  }
}

function exibirErroDestino(d, a) {
  d.innerHTML = `<section class="py-5"><div class="container text-center py-5"><div class="wt-error-icon mb-4"><i class="bi bi-exclamation-triangle"></i></div><h2 class="wt-section-title">Destino não encontrado</h2><p class="text-muted mb-4">O destino não existe ou o link está incorreto.</p><a href="index.html" class="btn wt-btn-card"><i class="bi bi-arrow-left me-2"></i>Voltar ao início</a></div></section>`;
  if (a) a.innerHTML = '';
}

function formatarData(d) {
  const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`;
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  atualizarNavbar();

  // Login form
  const loginForm = document.getElementById('form-login');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const regForm = document.getElementById('form-cadastro-usuario');
  if (regForm) regForm.addEventListener('submit', handleCadastroUsuario);

  // Logout button
  document.querySelectorAll('.btn-logout').forEach(b => b.addEventListener('click', logout));

  // Search
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderizarCards(searchInput.value));
    if (searchBtn) searchBtn.addEventListener('click', () => renderizarCards(searchInput.value));
  }

  if (document.getElementById('carrossel-container')) await renderizarCarrossel();
  if (document.getElementById('cards-container')) await renderizarCards();
  if (document.getElementById('map')) await renderizarMapa();
  if (document.getElementById('detalhes-container')) await renderizarDetalhes();
});

window.toggleFavorito = toggleFavorito;
window.toggleFavoritoDetalhe = toggleFavoritoDetalhe;
window.renderizarCards = renderizarCards;
