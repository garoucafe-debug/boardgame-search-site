// ===== スプレッドシート連携設定 =====
//
// Googleスプレッドシートを「ファイル」→「共有」→「ウェブに公開」から
// CSV形式で公開したときに発行されるURLをここに設定してください。
// （設定手順はREADME.mdの「スプレッドシートと連携して自動反映させる方法」を参照）
//
// 例: "https://docs.google.com/spreadsheets/d/e/2PACX-xxxxxxxx/pub?gid=0&single=true&output=csv"
//
// 空文字のままにしておくと、data/games.json のデータが表示されます（オフライン確認・デモ用）。

window.SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1SLarrRI2t_NJQ-_izrteuX0nuWGtUFLG_YGfhL3JG6c/export?format=csv&gid=0";
