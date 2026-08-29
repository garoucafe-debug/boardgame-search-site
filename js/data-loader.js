// ===== ゲームデータ読み込み共通処理 =====
// SHEET_CSV_URL（js/config.js）が設定されていればGoogleスプレッドシートのCSVを、
// 空であれば data/games.json を読み込んでゲームデータの配列を返す。
//
// スプレッドシートの列名（既存の「ボードゲーム管理表」の列をそのまま使う）：
// No. / 名前 / 正式名称 / ジャンル / 推奨プレイ人数 / 最大人数 / 最少人数 / プレイ時間 / 対象年齢 / 難易度
// これに加えてサイト表示用の4列（任意・空欄可）：紹介文 / 画像ファイル名 / YouTube URL / 貸出可否

// 難易度テキスト → CSSクラス用の英字（表示テキスト自体はスプレッドシートの日本語をそのまま使う）
const DIFFICULTY_CLASS = {
  入門: "beginner",
  初級: "novice",
  中級: "intermediate",
  上級: "advanced"
};

// 画像欄（画像ファイル名）の値を実際に読み込める画像URLに変換する。
// - Googleドライブの共有リンクが入っていれば、画像として表示できる形式のURLに変換する
//   （対象ファイルは「リンクを知っている全員が閲覧者」に共有されている必要がある）
// - http(s)から始まるURLはそのまま使う
// - それ以外は images/ フォルダ内のファイル名として扱う（従来どおりの使い方）
// - 空欄なら null（プレースホルダー表示）
function resolveImageUrl(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  if (v.includes("drive.google.com")) {
    const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/) || v.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1000`;
  }

  if (/^https?:\/\//i.test(v)) return v;

  return `images/${v}`;
}

// --- CSVパーサー（ダブルクォート・カンマ・改行を含むセルに対応） ---
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // 何もしない（\nで改行処理）
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ""));
}

// --- 数値抽出ヘルパー ---
// "不明" "不問" 空欄などは null を返す（＝絞り込みでは常にマッチさせる）
function parseNumber(text) {
  const s = String(text ?? "").trim();
  if (s === "" || s === "不明" || s === "不問") return null;
  const m = s.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// "30～150分" のような文字列から最短・最長の数値を抽出する
function parseRange(text) {
  const s = String(text ?? "").trim();
  if (s === "" || s === "不明" || s === "不問") return { min: null, max: null };
  const nums = s.match(/\d+(\.\d+)?/g);
  if (!nums) return { min: null, max: null };
  const values = nums.map(Number);
  return { min: Math.min(...values), max: Math.max(...values) };
}

// ジャンル欄は「/」区切りで最大2ジャンルまで入力できる（例: "ダイス/アクション"）。
function parseGenres(text) {
  const s = String(text ?? "").trim();
  if (!s) return [];
  return s.split("/").map(g => g.trim()).filter(Boolean).slice(0, 2);
}

// --- 行データ・オブジェクトを共通のゲーム形式に正規化 ---
function normalizeGame(raw) {
  const playersText = String(raw["推奨プレイ人数"] ?? "").trim();
  const timeText = String(raw["プレイ時間"] ?? "").trim();

  const minFromColumn = parseNumber(raw["最少人数"]);
  const maxFromColumn = parseNumber(raw["最大人数"]);
  const playersFromText = parseRange(playersText);
  const timeRange = parseRange(timeText);

  const lendableRaw = String(raw["貸出可否"] ?? "").trim();
  const genres = parseGenres(raw["ジャンル"]);

  return {
    id: String(raw["No."] ?? "").trim(),
    name: String(raw["名前"] ?? "").trim(),
    formal_name: String(raw["正式名称"] ?? "").trim(),
    genres: genres,
    genre: genres.join(" / "),
    players_text: playersText,
    // 「不明」「不問」は上限なし扱い（絞り込みでは常にマッチさせる）
    players_min: minFromColumn ?? playersFromText.min ?? 0,
    players_max: maxFromColumn ?? playersFromText.max ?? Infinity,
    time_text: timeText,
    time_min: timeRange.min,
    time_max: timeRange.max,
    age: String(raw["対象年齢"] ?? "").trim(),
    difficulty: String(raw["難易度"] ?? "").trim(),
    // 以下4列はサイト専用の追加項目。列が無い・空欄でも問題なく動作する
    description: String(raw["紹介文"] ?? "").trim(),
    image_filename: String(raw["画像ファイル名"] ?? "").trim(),
    youtube_url: String(raw["YouTube URL"] ?? "").trim(),
    // 空欄・"貸出可" は表示、"貸出不可" のときだけ非表示にする
    lendable: lendableRaw !== "貸出不可"
  };
}

function csvRowsToGames(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows
    .slice(1)
    .filter(r => r.some(cell => cell.trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] !== undefined ? r[idx] : "";
      });
      return normalizeGame(obj);
    })
    .filter(g => g.id !== "");
}

// --- メイン読み込み関数 ---
async function loadGamesData() {
  const sheetUrl = window.SHEET_CSV_URL && window.SHEET_CSV_URL.trim();

  if (sheetUrl) {
    const cacheBustUrl = sheetUrl + (sheetUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
    const res = await fetch(cacheBustUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("スプレッドシートの読み込みに失敗しました");
    const text = await res.text();
    return csvRowsToGames(parseCSV(text));
  }

  const res = await fetch("data/games.json");
  if (!res.ok) throw new Error("games.jsonの読み込みに失敗しました");
  const data = await res.json();
  return data.map(normalizeGame);
}
