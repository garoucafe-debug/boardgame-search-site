// ===== 個別ゲーム紹介ページ用スクリプト =====

function getGameId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?&]+)/,
    /(?:youtube\.com\/embed\/)([^?&]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function playersLabel(game) {
  return game.players_text || "不明";
}

function timeLabel(game) {
  return game.time_text || "不明";
}

// ---- LocalStorage ----
function ratingsKey(id) { return `bgcafe_ratings_${id}`; }
function commentsKey(id) { return `bgcafe_comments_${id}`; }

function getRatings(id) {
  try {
    return JSON.parse(localStorage.getItem(ratingsKey(id))) || [];
  } catch (e) {
    return [];
  }
}

function addRating(id, value) {
  const ratings = getRatings(id);
  ratings.push(value);
  localStorage.setItem(ratingsKey(id), JSON.stringify(ratings));
}

function getComments(id) {
  try {
    return JSON.parse(localStorage.getItem(commentsKey(id))) || [];
  } catch (e) {
    return [];
  }
}

function addComment(id, name, comment) {
  const comments = getComments(id);
  comments.push({ name, comment, date: new Date().toISOString() });
  localStorage.setItem(commentsKey(id), JSON.stringify(comments));
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---- 描画 ----
function renderNotFound() {
  document.getElementById("game-content").innerHTML = `
    <div class="not-found">
      <p>指定されたゲームが見つかりませんでした。</p>
    </div>
  `;
}

function renderGame(game) {
  document.getElementById("header-sub").textContent = game.name;

  const imageUrl = resolveImageUrl(game.image_filename);
  const imageHtml = imageUrl
    ? `<img class="hero" src="${imageUrl}" alt="${game.name}" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;hero placeholder&quot;>No Image</div>'">`
    : `<div class="hero placeholder">No Image</div>`;

  const difficultyClass = DIFFICULTY_CLASS[game.difficulty] || "unknown";
  const difficultyLabel = game.difficulty || "難易度不明";

  const subtitleHtml = game.formal_name && game.formal_name !== game.name
    ? `<div class="formal-name">${game.formal_name}</div>`
    : "";

  const ageHtml = game.age
    ? `<span class="item">🎂 ${game.age}</span>`
    : "";

  const youtubeId = extractYoutubeId(game.youtube_url);
  const videoHtml = youtubeId
    ? `<section class="block">
         <h3>インスト動画</h3>
         <div class="video-wrap">
           <iframe src="https://www.youtube.com/embed/${youtubeId}" title="${game.name} インスト動画" allowfullscreen></iframe>
         </div>
       </section>`
    : "";

  const descriptionHtml = game.description
    ? `<p class="description">${game.description}</p>`
    : `<p class="description">紹介文は準備中です。</p>`;

  document.getElementById("game-content").innerHTML = `
    <div class="game-detail">
      ${imageHtml}
      <div class="detail-body">
        <h2>${game.name}</h2>
        ${subtitleHtml}
        <div class="meta-row">
          <span class="item">👥 ${playersLabel(game)}</span>
          <span class="item">⏱ ${timeLabel(game)}</span>
          <span class="item">🎯 ${game.genre || "ジャンル不明"}</span>
          <span class="item difficulty-${difficultyClass}">📶 ${difficultyLabel}</span>
          ${ageHtml}
        </div>
        ${descriptionHtml}
        ${videoHtml}

        <section class="block" id="rating-section">
          <h3>評価</h3>
          <div class="rating-summary">
            <span class="stars-display" id="rating-average-stars"></span>
            <span id="rating-average-text"></span>
          </div>
          <div class="rating-input">
            <div class="stars" id="rating-stars">
              <span class="star" data-value="1">★</span><span class="star" data-value="2">★</span><span class="star" data-value="3">★</span><span class="star" data-value="4">★</span><span class="star" data-value="5">★</span>
            </div>
            <div class="rating-note">星をクリックして評価してください</div>
          </div>
        </section>

        <section class="block" id="comment-section">
          <h3>コメント</h3>
          <form class="comment-form" id="comment-form">
            <input type="text" id="comment-name" placeholder="お名前" maxlength="30" required>
            <textarea id="comment-text" placeholder="コメントを入力してください" maxlength="300" required></textarea>
            <button type="submit" class="btn">投稿する</button>
          </form>
          <div class="comment-list" id="comment-list"></div>
        </section>
      </div>
    </div>
  `;

  setupRating(game.id);
  setupComments(game.id);
}

function setupRating(id) {
  const starsEl = document.getElementById("rating-stars");
  const stars = Array.from(starsEl.querySelectorAll(".star"));

  function refreshAverage() {
    const ratings = getRatings(id);
    const avgStarsEl = document.getElementById("rating-average-stars");
    const avgTextEl = document.getElementById("rating-average-text");
    if (ratings.length === 0) {
      avgStarsEl.textContent = "☆☆☆☆☆";
      avgTextEl.textContent = "まだ評価がありません";
      return;
    }
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const rounded = Math.round(avg);
    avgStarsEl.textContent = "★".repeat(rounded) + "☆".repeat(5 - rounded);
    avgTextEl.textContent = `平均 ${avg.toFixed(1)}（${ratings.length}件の評価）`;
  }

  stars.forEach(star => {
    star.addEventListener("click", () => {
      const value = Number(star.dataset.value);
      addRating(id, value);
      stars.forEach(s => s.classList.toggle("active", Number(s.dataset.value) <= value));
      refreshAverage();
    });
  });

  refreshAverage();
}

function setupComments(id) {
  const listEl = document.getElementById("comment-list");
  const form = document.getElementById("comment-form");

  function refreshList() {
    const comments = getComments(id).slice().reverse();
    if (comments.length === 0) {
      listEl.innerHTML = `<div class="comment-empty">まだコメントはありません。最初のコメントを投稿してみましょう。</div>`;
      return;
    }
    listEl.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-head">
          <span>${escapeHtml(c.name)}</span>
          <span class="comment-date">${formatDate(c.date)}</span>
        </div>
        <div class="comment-body">${escapeHtml(c.comment)}</div>
      </div>
    `).join("");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameEl = document.getElementById("comment-name");
    const textEl = document.getElementById("comment-text");
    const name = nameEl.value.trim();
    const comment = textEl.value.trim();
    if (!name || !comment) return;
    addComment(id, name, comment);
    nameEl.value = "";
    textEl.value = "";
    refreshList();
  });

  refreshList();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setupBackLink() {
  const link = document.getElementById("back-link");
  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    window.close();
    setTimeout(() => {
      window.location.href = link.href;
    }, 300);
  });
}

async function init() {
  setupBackLink();
  const id = getGameId();
  if (!id) {
    renderNotFound();
    return;
  }
  try {
    const games = await loadGamesData();
    const game = games.find(g => String(g.id) === String(id));
    // 貸出不可のゲームは個別ページも非公開扱いにする
    if (!game || !game.lendable) {
      renderNotFound();
      return;
    }
    renderGame(game);
  } catch (e) {
    renderNotFound();
  }
}

init();
