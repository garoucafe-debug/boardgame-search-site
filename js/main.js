// ===== 一覧・検索ページ用スクリプト =====

let allGames = [];

const els = {
  searchBox: document.getElementById("search-box"),
  filterPlayers: document.getElementById("filter-players"),
  filterTime: document.getElementById("filter-time"),
  filterGenre: document.getElementById("filter-genre"),
  filterDifficulty: document.getElementById("filter-difficulty"),
  grid: document.getElementById("game-grid"),
  noResults: document.getElementById("no-results"),
  resultCount: document.getElementById("result-count")
};

async function loadGames() {
  try {
    const games = await loadGamesData();
    // 貸出不可のゲームは一覧に表示しない
    allGames = games.filter(g => g.lendable);
  } catch (e) {
    allGames = [];
  }
  populateGenreOptions();
  render();
}

// ジャンルはスプレッドシートの自由記述のため、実際に登場する値からドロップダウンを自動生成する
// 1ゲームにつき最大2ジャンル（「/」区切り）持てるため、個々のジャンルに分解してから選択肢を作る
function populateGenreOptions() {
  const genres = [...new Set(allGames.flatMap(g => g.genres))]
    .sort((a, b) => a.localeCompare(b, "ja"));

  genres.forEach(genre => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    els.filterGenre.appendChild(option);
  });
}

function matchesPlayers(game, value) {
  if (!value) return true;
  const min = game.players_min;
  const max = game.players_max;
  if (value === "1") return min <= 1 && max >= 1;
  if (value === "2") return min <= 2 && max >= 2;
  if (value === "3-4") return min <= 4 && max >= 3;
  if (value === "5+") return max >= 5;
  return true;
}

function matchesTime(game, value) {
  if (!value) return true;
  // プレイ時間が「不明」などで判定不能な場合は、絞り込みで除外しない
  if (game.time_min === null || game.time_max === null) return true;
  const min = game.time_min;
  const max = game.time_max;
  if (value === "0-30") return min <= 30;
  if (value === "30-60") return max >= 30 && min <= 60;
  if (value === "60-120") return max >= 60 && min <= 120;
  if (value === "120+") return max >= 120;
  return true;
}

function getFilteredGames() {
  const keyword = els.searchBox.value.trim().toLowerCase();
  const players = els.filterPlayers.value;
  const time = els.filterTime.value;
  const genre = els.filterGenre.value;
  const difficulty = els.filterDifficulty.value;

  return allGames.filter(game => {
    if (keyword && !game.name.toLowerCase().includes(keyword)) return false;
    if (!matchesPlayers(game, players)) return false;
    if (!matchesTime(game, time)) return false;
    if (genre && !game.genres.includes(genre)) return false;
    if (difficulty && game.difficulty !== difficulty) return false;
    return true;
  });
}

function playersLabel(game) {
  return game.players_text || "不明";
}

function timeLabel(game) {
  return game.time_text || "不明";
}

function createCard(game) {
  const card = document.createElement("a");
  card.className = "game-card";
  card.href = `game.html?id=${encodeURIComponent(game.id)}`;
  card.target = "_blank";
  card.rel = "noopener";
  card.style.textDecoration = "none";
  card.style.color = "inherit";

  const imageUrl = resolveImageUrl(game.image_filename);
  const thumbHtml = imageUrl
    ? `<img class="thumb" src="${imageUrl}" alt="${game.name}" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;thumb placeholder&quot;>No Image</div>'">`
    : `<div class="thumb placeholder">No Image</div>`;

  const difficultyClass = DIFFICULTY_CLASS[game.difficulty] || "unknown";
  const genreTags = (game.genres.length > 0 ? game.genres : ["ジャンル不明"])
    .map(g => `<span class="tag">${g}</span>`)
    .join("");
  const placeTag = game.place ? `<span class="tag">📍 ${game.place}</span>` : "";

  card.innerHTML = `
    ${thumbHtml}
    <div class="info">
      <h3>${game.name}</h3>
      <div class="tag-row">
        <span class="tag">${playersLabel(game)}</span>
        <span class="tag">${timeLabel(game)}</span>
        ${genreTags}
        <span class="tag difficulty-${difficultyClass}">${game.difficulty || "難易度不明"}</span>
        ${placeTag}
      </div>
    </div>
  `;
  return card;
}

function render() {
  const filtered = getFilteredGames();
  els.grid.innerHTML = "";
  filtered.forEach(game => els.grid.appendChild(createCard(game)));

  els.noResults.style.display = filtered.length === 0 ? "block" : "none";
  els.resultCount.textContent = `${filtered.length}件のゲームが見つかりました`;
}

[els.searchBox, els.filterPlayers, els.filterTime, els.filterGenre, els.filterDifficulty]
  .forEach(el => el.addEventListener("input", render));

loadGames();
