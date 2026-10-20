// 予約受付API（Google Apps Script）
// スプレッドシートの「拡張機能 > Apps Script」に貼り付け、ウェブアプリとしてデプロイします。

const SHEET_NAME = "予約";
const NOTIFY_EMAIL = ""; // 空欄ならスプレッドシートの持ち主に通知
const HEADERS = ["予約番号", "ステータス", "受付日時", "施設ID", "施設名", "客室ID", "客室名", "チェックイン", "チェックアウト", "泊数", "人数", "合計金額", "お名前", "フリガナ", "メール", "電話", "到着予定", "ご要望", "キャンセル日時"];
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i]));

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold").setBackground("#2f4a3a").setFontColor("#ffffff");
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, HEADERS.length).getDisplayValues() : [];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function nights_(ci, co) {
  const out = [];
  const d = new Date(ci + "T00:00:00Z");
  const end = new Date(co + "T00:00:00Z");
  while (d < end) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

function bookedMap_(rows, ci, co, property) {
  const nights = nights_(ci, co);
  const active = rows.filter((r) => r[COL["ステータス"]] === "予約確定" && (!property || r[COL["施設ID"]] === property));
  const map = {};
  const keys = [...new Set(active.map((r) => r[COL["施設ID"]] + "|" + r[COL["客室ID"]]))];
  keys.forEach((k) => {
    const list = active.filter((r) => r[COL["施設ID"]] + "|" + r[COL["客室ID"]] === k);
    map[k] = Math.max(0, ...nights.map((n) => list.filter((r) => r[COL["チェックイン"]] <= n && n < r[COL["チェックアウト"]]).length));
  });
  return map;
}

function toBooking_(r) {
  return {
    id: r[COL["予約番号"]], status: r[COL["ステータス"]] === "予約確定" ? "confirmed" : "cancelled",
    propertyId: r[COL["施設ID"]], propertyName: r[COL["施設名"]], roomId: r[COL["客室ID"]], roomName: r[COL["客室名"]],
    checkin: r[COL["チェックイン"]], checkout: r[COL["チェックアウト"]], nights: Number(r[COL["泊数"]]),
    guests: Number(r[COL["人数"]]), total: Number(String(r[COL["合計金額"]]).replace(/[^\d]/g, "")),
    guest: { name: r[COL["お名前"]], kana: r[COL["フリガナ"]], email: r[COL["メール"]], phone: r[COL["電話"]], arrival: r[COL["到着予定"]], note: r[COL["ご要望"]] }
  };
}

function findIndex_(rows, id, email) {
  return rows.findIndex((r) => String(r[COL["予約番号"]]).toUpperCase() === String(id || "").trim().toUpperCase()
    && String(r[COL["メール"]]).toLowerCase() === String(email || "").trim().toLowerCase());
}

const isDate_ = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const clip_ = (s, n) => String(s ?? "").slice(0, n);

function doGet(e) {
  const p = e.parameter || {};
  if (p.action !== "availability" || !isDate_(p.checkin) || !isDate_(p.checkout)) return json_({ ok: false, error: "bad_request" });
  return json_({ ok: true, booked: bookedMap_(rows_(), p.checkin, p.checkout, p.property || "") });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad_request" }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (req.action === "create") return json_(create_(req.booking || {}));
    if (req.action === "lookup") {
      const rows = rows_();
      const i = findIndex_(rows, req.id, req.email);
      return json_(i < 0 ? { ok: false, error: "not_found" } : { ok: true, booking: toBooking_(rows[i]) });
    }
    if (req.action === "cancel") return json_(cancel_(req.id, req.email));
    return json_({ ok: false, error: "bad_request" });
  } finally {
    lock.releaseLock();
  }
}

function create_(b) {
  const g = b.guest || {};
  if (!isDate_(b.checkin) || !isDate_(b.checkout) || b.checkin >= b.checkout || !b.propertyId || !b.roomId || !g.name || !g.email) {
    return { ok: false, error: "bad_request" };
  }
  const stock = Math.max(0, Number(b.stock) || 0);
  const used = bookedMap_(rows_(), b.checkin, b.checkout, b.propertyId)[b.propertyId + "|" + b.roomId] || 0;
  if (used >= stock) return { ok: false, error: "full" };

  const tz = Session.getScriptTimeZone();
  const id = "R" + Utilities.formatDate(new Date(), tz, "yyMMdd") + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 5).toUpperCase();
  const row = [
    id, "予約確定", Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss"),
    clip_(b.propertyId, 40), clip_(b.propertyName, 100), clip_(b.roomId, 40), clip_(b.roomName, 100),
    b.checkin, b.checkout, String(nights_(b.checkin, b.checkout).length), String(Number(b.guests) || 1), String(Number(b.total) || 0),
    clip_(g.name, 100), clip_(g.kana, 100), clip_(g.email, 200), clip_(g.phone, 30), clip_(g.arrival, 20), clip_(g.note, 500), ""
  ].map((v) => (/^[=+\-@]/.test(v) ? "'" + v : v));
  const sh = sheet_();
  sh.getRange(sh.getLastRow() + 1, 1, 1, HEADERS.length).setNumberFormat("@").setValues([row]);
  notify_("【新規予約】" + id + " " + g.name + "様", row);
  return { ok: true, booking: toBooking_(row) };
}

function cancel_(id, email) {
  const rows = rows_();
  const i = findIndex_(rows, id, email);
  if (i < 0) return { ok: false, error: "not_found" };
  if (rows[i][COL["ステータス"]] !== "予約確定") return { ok: true, booking: toBooking_(rows[i]) };
  const tz = Session.getScriptTimeZone();
  const sh = sheet_();
  sh.getRange(i + 2, COL["ステータス"] + 1).setValue("キャンセル");
  sh.getRange(i + 2, COL["キャンセル日時"] + 1).setNumberFormat("@").setValue(Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss"));
  rows[i][COL["ステータス"]] = "キャンセル";
  notify_("【キャンセル】" + rows[i][COL["予約番号"]] + " " + rows[i][COL["お名前"]] + "様", rows[i]);
  return { ok: true, booking: toBooking_(rows[i]) };
}

function notify_(subject, row) {
  const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const body = HEADERS.map((h, i) => h + ": " + (row[i] || "")).join("\n") + "\n\n" + SpreadsheetApp.getActiveSpreadsheet().getUrl();
  try { MailApp.sendEmail(to, subject, body); } catch (err) { console.error(err); }
}

// エディタで一度実行すると、シート作成と権限の承認が行われます
function setup() {
  sheet_();
}
