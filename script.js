const API_KEY = '60c7adcff566c19c283f58cfcb3ba4b6';
const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

// App state
let currentPage = 1;
let totalPages = 1;
let currentQuery = '';
let currentGenre = '';
let currentMedia = 'movie';

// DOM elements
const searchEl = document.getElementById('search');
const resultsEl = document.getElementById('results');
const paginationEl = document.getElementById('pagination');
const genreSelect = document.getElementById('genreSelect');
const mediaTypeSelect = document.getElementById('mediaType');
const clearBtn = document.getElementById('clear');
const sectionTitle = document.getElementById('sectionTitle');

// Modal elements
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalOverview = document.getElementById('modalOverview');
const modalTagline = document.getElementById('modalTagline');
const modalInfo = document.getElementById('modalInfo');
const modalRating = document.getElementById('modalRating');
const modalVideos = document.getElementById('modalVideos');
const modalSimilar = document.getElementById('modalSimilar');

// Helper functions
async function fetchJSON(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v);
  });
  url.searchParams.set('api_key', API_KEY);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// Load genres
async function loadGenres(media = 'movie') {
  try {
    const data = await fetchJSON(`/genre/${media}/list`, { language: 'en-US' });
    genreSelect.innerHTML =
      '<option value="">All genres</option>' +
      data.genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  } catch (e) {
    console.error('Genres load failed', e);
  }
}

// Update section title
function updateSectionTitle() {
  let title = 'Popular ';
  title += currentMedia === 'movie' ? 'Movies' : 'TV Shows';

  if (currentQuery) {
    title = `Search Results for "${currentQuery}"`;
  } else if (currentGenre) {
    const genreOption = genreSelect.querySelector(`option[value="${currentGenre}"]`);
    if (genreOption) {
      title = `${genreOption.textContent} ${currentMedia === 'movie' ? 'Movies' : 'TV Shows'}`;
    }
  }

  sectionTitle.textContent = title;
}

// Load and display results
async function loadResults(page = 1) {
  currentPage = page;
  resultsEl.innerHTML = '<div class="muted pill">Loading…</div>';

  try {
    let data;

    if (currentQuery) {
      data = await fetchJSON(`/search/${currentMedia}`, {
        query: currentQuery,
        page,
        include_adult: false,
        language: 'en-US'
      });
    } else {
      const params = { page, language: 'en-US', sort_by: 'popularity.desc' };
      if (currentGenre) params.with_genres = currentGenre;
      data = await fetchJSON(`/discover/${currentMedia}`, params);
    }

    totalPages = Math.min(data.total_pages || 1, 500);
    updateSectionTitle();
    renderResults(data.results || []);
    renderPagination();
  } catch (e) {
    resultsEl.innerHTML = '<div class="muted">Failed to load results. Please check your API key and try again.</div>';
    console.error('Load results error:', e);
  }
}

function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = '<div class="muted">No results found</div>';
    return;
  }

  resultsEl.innerHTML = items.map(it => {
    const title = it.title || it.name || 'Untitled';
    const poster = it.poster_path ? IMG_BASE + it.poster_path : '';
    const release = it.release_date || it.first_air_date || '';
    const rating = it.vote_average ? it.vote_average.toFixed(1) : '—';
    return `
      <article class="card" data-id="${it.id}" data-media="${currentMedia}">
        <img class="poster" loading="lazy" src="${poster}" alt="${title}" />
        <div class="title">${title}</div>
        <div class="muted">${release}</div>
        <div class="meta">
          <div class="muted">${it.genre_ids ? it.genre_ids.join(',') : ''}</div>
          <div class="pill">⭐ ${rating}</div>
        </div>
      </article>
    `;
  }).join('');

  resultsEl.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openDetails(card.dataset.media, card.dataset.id));
  });
}

function renderPagination() {
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const pagesToShow = 5;
  let start = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
  let end = Math.min(totalPages, start + pagesToShow - 1);

  if (end - start < pagesToShow - 1) {
    start = Math.max(1, end - pagesToShow + 1);
  }

  let html = '';
  if (currentPage > 1) {
    html += `<button class="pill" data-page="1">First</button>`;
    html += `<button class="pill" data-page="${currentPage - 1}">Prev</button>`;
  }

  for (let p = start; p <= end; p++) {
    const isActive = p === currentPage;
    html += `<button class="pill" data-page="${p}" ${isActive ? 'style="background: #4ecdc4; color: #000;"' : ''}>${p}</button>`;
  }

  if (currentPage < totalPages) {
    html += `<button class="pill" data-page="${currentPage + 1}">Next</button>`;
    html += `<button class="pill" data-page="${totalPages}">Last</button>`;
  }

  paginationEl.innerHTML = html;
  paginationEl.querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => loadResults(Number(b.dataset.page)))
  );
}

async function openDetails(media, id) {
  try {
    modal.classList.add('open');
    modalVideos.innerHTML = '';
    modalSimilar.innerHTML = '';
    modalPoster.src = '';
    modalTitle.textContent = 'Loading…';

    const details = await fetchJSON(`/${media}/${id}`, { language: 'en-US' });
    const videos = await fetchJSON(`/${media}/${id}/videos`, { language: 'en-US' });
    const similar = await fetchJSON(`/${media}/${id}/similar`, { language: 'en-US', page: 1 });

    modalPoster.src = details.poster_path ? IMG_BASE + details.poster_path : '';
    modalTitle.textContent = details.title || details.name || 'Untitled';
    modalTagline.textContent = details.tagline || '';
    modalOverview.textContent = details.overview || 'No overview.';
    modalInfo.textContent = `${details.status || ''} • ${details.release_date || details.first_air_date || ''} • ${details.runtime ? details.runtime + 'm' : ''}`;
    modalRating.innerHTML = details.vote_average ? `⭐ ${details.vote_average.toFixed(1)} (${details.vote_count})` : '—';

    const youtubeVideos = (videos.results || []).filter(v => v.site === 'YouTube');
    if (youtubeVideos.length) {
      modalVideos.innerHTML = youtubeVideos.slice(0, 2).map(v =>
        `<div style="margin-top:8px">
          <strong>${v.type} — ${v.name}</strong>
          <iframe src="https://www.youtube.com/embed/${v.key}" allowfullscreen loading="lazy"></iframe>
        </div>`
      ).join('');
    }

    if ((similar.results || []).length) {
      modalSimilar.innerHTML = similar.results.slice(0, 10).map(s => {
        const img = s.poster_path ? IMG_BASE + s.poster_path : '';
        return `
          <div class="mini" data-media="${media}" data-id="${s.id}">
            <img class="poster" src="${img}" loading="lazy" style="height:160px;border-radius:8px" alt="${s.title || s.name}" />
            <div style="font-size:13px; margin-top: 5px;">${s.title || s.name}</div>
          </div>
        `;
      }).join('');

      modalSimilar.querySelectorAll('.mini').forEach(el => {
        el.addEventListener('click', () => openDetails(el.dataset.media, el.dataset.id));
      });
    }
  } catch (e) {
    modalTitle.textContent = 'Failed to load details';
    modalOverview.textContent = 'An error occurred while loading the details.';
    console.error('Modal details error:', e);
  }
}

function closeModalFunc() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

closeModal.addEventListener('click', closeModalFunc);
modal.addEventListener('click', e => {
  if (e.target === modal) closeModalFunc();
});

// Debounce
function debounce(fn, wait = 350) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

// Event listeners
searchEl.addEventListener('input', debounce(e => {
  currentQuery = e.target.value.trim();
  currentPage = 1;
  loadResults(1);
}, 450));

genreSelect.addEventListener('change', e => {
  currentGenre = e.target.value;
  currentPage = 1;
  loadResults(1);
});

mediaTypeSelect.addEventListener('change', e => {
  currentMedia = e.target.value;
  currentPage = 1;
  currentQuery = '';
  currentGenre = '';
  searchEl.value = '';
  genreSelect.value = '';
  loadGenres(currentMedia).then(() => loadResults(1));
});

clearBtn.addEventListener('click', () => {
  searchEl.value = '';
  currentQuery = '';
  currentGenre = '';
  genreSelect.value = '';
  currentPage = 1;
  loadResults(1);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    closeModalFunc();
  }
});

// Initialize app
async function init() {
  try {
    await loadGenres(currentMedia);
    await loadResults(1);
  } catch (e) {
    console.error('Initialization error:', e);
    resultsEl.innerHTML = '<div class="muted">Failed to initialize app. Please check your API key.</div>';
  }
}

init();



