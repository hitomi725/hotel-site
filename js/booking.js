(() => {
  const { SITE, PROPERTIES, DEFAULT_ROOMS } = window;
  const API = SITE.bookingApiUrl;
  const KEY = "hb_bookings_v1";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const yen = (n) => "¥" + Number(n).toLocaleString("ja-JP");
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = (s) => new Date(s + "T00:00:00");
  const WEEK = "日月火水木金土";
  const fmtDate = (s) => { const d = parse(s); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`; };
  const telHref = (n) => "tel:" + String(n).replace(/[^\d+]/g, "");
  const NET_ERROR = `通信エラーが発生しました。時間をおいて再度お試しいただくか、お電話（${SITE.phone}）でお問い合わせください。`;

  const roomsOf = (p) => p.rooms || DEFAULT_ROOMS;
  const findRoom = (pid, rid) => {
    const p = PROPERTIES.find((x) => x.id === pid);
    return p && { property: p, room: roomsOf(p).find((r) => r.id === rid) };
  };
  const nightsOf = (ci, co) => {
    const out = [];
    for (let d = parse(ci); iso(d) < co; d.setDate(d.getDate() + 1)) out.push(iso(d));
    return out;
  };

  // ---- Storage: Google Apps Script API, or this browser as a fallback ----
  const loadLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const saveLocal = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } };
  const bookedFrom = (list, ci, co) => {
    const map = {};
    const nights = nightsOf(ci, co);
    list.filter((b) => b.status === "confirmed").forEach((b) => { const k = `${b.propertyId}|${b.roomId}`; map[k] = map[k] || []; map[k].push(b); });
    return Object.fromEntries(Object.entries(map).map(([k, bs]) =>
      [k, Math.max(0, ...nights.map((n) => bs.filter((b) => b.checkin <= n && n < b.checkout).length))]));
  };
  const post = async (payload) => {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const newId = () => {
    const a = new Uint8Array(3);
    crypto.getRandomValues(a);
    return `R${iso(new Date()).slice(2).replace(/-/g, "")}-${[...a].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 5).toUpperCase()}`;
  };
  const matches = (b, id, email) => b.id.toUpperCase() === id.trim().toUpperCase() && b.guest.email.toLowerCase() === email.trim().toLowerCase();

  const store = API ? {
    async booked(scope, ci, co) {
      const r = await fetch(`${API}?${new URLSearchParams({ action: "availability", property: scope || "", checkin: ci, checkout: co })}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      return j.booked;
    },
    create: (b) => post({ action: "create", booking: b }),
    find: (id, email) => post({ action: "lookup", id, email }),
    cancel: (id, email) => post({ action: "cancel", id, email })
  } : {
    async booked(_, ci, co) { return bookedFrom(loadLocal(), ci, co); },
    async create(b) {
      const list = loadLocal();
      if ((bookedFrom(list, b.checkin, b.checkout)[`${b.propertyId}|${b.roomId}`] || 0) >= b.stock) return { ok: false, error: "full" };
      const booking = { ...b, id: newId(), status: "confirmed", createdAt: new Date().toISOString() };
      delete booking.stock;
      return saveLocal([...list, booking]) ? { ok: true, booking } : { ok: false, error: "storage" };
    },
    async find(id, email) {
      const b = loadLocal().find((x) => matches(x, id, email));
      return b ? { ok: true, booking: b } : { ok: false, error: "not_found" };
    },
    async cancel(id, email) {
      const list = loadLocal();
      const b = list.find((x) => matches(x, id, email));
      if (!b) return { ok: false, error: "not_found" };
      b.status = "cancelled";
      b.cancelledAt = new Date().toISOString();
      saveLocal(list);
      return { ok: true, booking: b };
    }
  };

  // ---- UI ----
  const STEPS = ["客室を選ぶ", "お客様情報", "内容の確認", "予約完了"];
  const stepper = (n) => `<ol class="steps" aria-label="予約の手順">${STEPS.map((s, i) =>
    `<li class="${i < n ? "is-done" : i === n ? "is-current" : ""}" ${i === n ? 'aria-current="step"' : ""}><span>${i + 1}</span>${s}</li>`).join("")}</ol>`;
  const stayLine = (d) => `${esc(fmtDate(d.checkin))} 〜 ${esc(fmtDate(d.checkout))}（${d.nights}泊）／ ${d.guests}名`;
  const loading = (text) => `<p class="booking__loading" role="status"><span class="spinner" aria-hidden="true"></span>${esc(text)}</p>`;

  const show = (html) => {
    window.App.openModal(`<div class="detail__body booking">${html}</div>`);
    document.querySelector(".modal__panel").scrollTop = 0;
  };
  const busy = (btn, text) => { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = text; };

  let draft = null;
  let current = null;
  let renderSeq = 0;

  function start({ propertyId, checkin, checkout, guests }) {
    draft = { scope: propertyId, propertyId, checkin, checkout, guests: Number(guests), nights: nightsOf(checkin, checkout).length, guest: {} };
    renderRooms();
  }

  async function renderRooms() {
    const d = draft;
    const seq = ++renderSeq;
    const head = `${stepper(0)}<h2 class="detail__name" id="modalTitle">客室を選ぶ</h2><p class="result__summary">${stayLine(d)}</p>`;
    show(head + loading("空室を確認しています…"));
    let booked;
    try { booked = await store.booked(d.scope, d.checkin, d.checkout); }
    catch { if (seq === renderSeq) show(head + `<p class="booking__error" role="alert">${esc(NET_ERROR)}</p>`); return; }
    if (seq !== renderSeq) return;

    const targets = d.scope ? PROPERTIES.filter((p) => p.id === d.scope) : PROPERTIES;
    const blocks = targets.map((p) => {
      const rows = roomsOf(p).map((r) => {
        const left = r.stock - (booked[`${p.id}|${r.id}`] || 0);
        const tooSmall = r.capacity < d.guests;
        const status = tooSmall ? `<span class="room__ng">定員${r.capacity}名まで</span>`
          : left <= 0 ? `<span class="room__ng">満室</span>`
          : `<button class="btn btn--accent room__pick" data-pick="${esc(p.id)}|${esc(r.id)}">選択する</button>`;
        return `
          <li class="room ${tooSmall || left <= 0 ? "is-disabled" : ""}">
            <img src="${esc(r.img)}" alt="" loading="lazy">
            <div class="room__info">
              <p class="room__name">${esc(r.name)} <small>${esc(r.size)}・定員${r.capacity}名</small></p>
              <p class="room__desc">${esc(r.desc)}</p>
              ${!tooSmall && left > 0 && left <= 2 ? `<p class="room__left">残り${left}室</p>` : ""}
            </div>
            <div class="room__price">
              <p><strong>${yen(r.price * d.nights)}</strong><small>${d.nights}泊・1室 税込</small></p>
              ${status}
            </div>
          </li>`;
      }).join("");
      return `<section class="room-group"><h3>${esc(p.name)} <small>${esc(p.area)}</small></h3><ul class="rooms">${rows}</ul></section>`;
    }).join("");
    const bigGroup = d.guests > Math.max(...PROPERTIES.flatMap((p) => roomsOf(p).map((r) => r.capacity)));
    show(`${head}
      ${bigGroup ? `<p class="booking__note">${d.guests}名様でのご宿泊は複数室のご予約となります。お電話（<a href="${telHref(SITE.phone)}">${esc(SITE.phone)}</a>）にてお問い合わせください。</p>` : ""}
      ${blocks}`);
  }

  function renderGuest(errors = {}) {
    const g = draft.guest;
    const { property, room } = findRoom(draft.propertyId, draft.roomId);
    const field = (name, label, type, attrs = "") => `
      <label class="bfield ${errors[name] ? "is-invalid" : ""}">
        <span>${label}</span>
        <input type="${type}" name="${name}" value="${esc(g[name])}" ${attrs} ${errors[name] ? `aria-invalid="true" aria-describedby="err-${name}"` : ""}>
        ${errors[name] ? `<em id="err-${name}">${esc(errors[name])}</em>` : ""}
      </label>`;
    const times = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00以降"];
    show(`
      ${stepper(1)}
      <h2 class="detail__name" id="modalTitle">お客様情報</h2>
      <p class="result__summary">${esc(property.name)}・${esc(room.name)}<br>${stayLine(draft)}</p>
      <form class="bform" id="guestForm" novalidate>
        ${field("name", "お名前（必須）", "text", 'autocomplete="name" placeholder="山田 太郎"')}
        ${field("kana", "フリガナ（必須）", "text", 'placeholder="ヤマダ タロウ"')}
        ${field("email", "メールアドレス（必須）", "email", 'autocomplete="email" placeholder="example@mail.com"')}
        ${field("phone", "電話番号（必須）", "tel", 'autocomplete="tel" placeholder="090-0000-0000"')}
        <label class="bfield"><span>到着予定時刻</span>
          <select name="arrival">${times.map((t) => `<option ${g.arrival === t ? "selected" : ""}>${t}</option>`).join("")}</select>
        </label>
        <label class="bfield"><span>ご要望（任意）</span>
          <textarea name="note" rows="3" maxlength="500" placeholder="アレルギー、記念日のご利用など">${esc(g.note)}</textarea>
        </label>
        <div class="detail__actions">
          <button type="button" class="btn btn--ghost" data-back="rooms">戻る</button>
          <button type="submit" class="btn btn--accent">確認へ進む</button>
        </div>
      </form>`);
    const firstErr = document.querySelector(".bfield.is-invalid input");
    if (firstErr) firstErr.focus();
  }

  function validate(g) {
    const e = {};
    if (!g.name) e.name = "お名前を入力してください。";
    if (!g.kana) e.kana = "フリガナを入力してください。";
    else if (!/^[゠-ヿ぀-ゟ\s　ー]+$/.test(g.kana)) e.kana = "フリガナはカタカナで入力してください。";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) e.email = "メールアドレスの形式をご確認ください。";
    const digits = g.phone.replace(/[^\d]/g, "");
    if (digits.length < 10 || digits.length > 11) e.phone = "電話番号は10〜11桁の数字で入力してください。";
    return e;
  }

  function renderConfirm(error = "") {
    const d = draft;
    const { property, room } = findRoom(d.propertyId, d.roomId);
    const g = d.guest;
    show(`
      ${stepper(2)}
      <h2 class="detail__name" id="modalTitle">内容の確認</h2>
      ${error ? `<p class="booking__error" role="alert">${esc(error)}</p>` : ""}
      <dl class="detail__info booking__dl">
        <dt>施設</dt><dd>${esc(property.name)}</dd>
        <dt>客室</dt><dd>${esc(room.name)}（${esc(room.size)}）</dd>
        <dt>日程</dt><dd>${esc(fmtDate(d.checkin))} 〜 ${esc(fmtDate(d.checkout))}・${d.nights}泊</dd>
        <dt>人数</dt><dd>${d.guests}名</dd>
        <dt>チェックイン</dt><dd>${esc(SITE.checkinTime)}〜（到着予定 ${esc(g.arrival)}）</dd>
        <dt>お名前</dt><dd>${esc(g.name)}（${esc(g.kana)}）様</dd>
        <dt>連絡先</dt><dd>${esc(g.email)}<br>${esc(g.phone)}</dd>
        ${g.note ? `<dt>ご要望</dt><dd>${esc(g.note)}</dd>` : ""}
      </dl>
      <div class="booking__total"><span>お支払い合計（税込・現地払い）</span><strong>${yen(room.price * d.nights)}</strong></div>
      <p class="booking__policy"><b>キャンセルポリシー</b><br>${esc(SITE.cancelPolicy)}</p>
      <label class="booking__agree"><input type="checkbox" id="agree"> キャンセルポリシーに同意します</label>
      <div class="detail__actions">
        <button type="button" class="btn btn--ghost" data-back="guest">修正する</button>
        <button type="button" class="btn btn--accent" data-confirm disabled>予約を確定する</button>
      </div>`);
  }

  async function confirm(btn) {
    const d = draft;
    const { property, room } = findRoom(d.propertyId, d.roomId);
    busy(btn, "送信中…");
    let res;
    try {
      res = await store.create({
        propertyId: property.id, propertyName: property.name, roomId: room.id, roomName: room.name, stock: room.stock,
        checkin: d.checkin, checkout: d.checkout, nights: d.nights, guests: d.guests, total: room.price * d.nights, guest: { ...d.guest }
      });
    } catch { renderConfirm(NET_ERROR); return; }
    if (!res.ok) {
      renderConfirm(res.error === "full" ? "申し訳ございません。ただいまこの客室は満室になりました。戻って別の客室をお選びください。"
        : res.error === "storage" ? "このブラウザでは予約を保存できませんでした。お電話でご予約ください。" : NET_ERROR);
      return;
    }
    draft = null;
    renderDone(res.booking);
  }

  const mailHref = (b) => {
    const body = [
      `予約番号: ${b.id}`, `施設: ${b.propertyName}`, `客室: ${b.roomName}`,
      `日程: ${fmtDate(b.checkin)} 〜 ${fmtDate(b.checkout)}（${b.nights}泊）`, `人数: ${b.guests}名`,
      `料金: ${yen(b.total)}（税込）`, `お名前: ${b.guest.name}（${b.guest.kana}）`,
      `メール: ${b.guest.email}`, `電話: ${b.guest.phone}`, `到着予定: ${b.guest.arrival}`,
      `ご要望: ${b.guest.note || "なし"}`
    ].join("\n");
    return `mailto:${SITE.email}?subject=${encodeURIComponent(`【予約】${b.id} ${b.guest.name}様`)}&body=${encodeURIComponent(body)}`;
  };

  function renderDone(b) {
    show(`
      ${stepper(3)}
      <div class="booking__done">
        <p class="booking__check" aria-hidden="true">✓</p>
        <h2 class="detail__name" id="modalTitle">ご予約が完了しました</h2>
        <p>${esc(b.guest.name)} 様、ご予約ありがとうございます。</p>
        <p class="booking__id">予約番号<strong>${esc(b.id)}</strong></p>
        <p class="booking__small">予約の確認・キャンセルには、予約番号とメールアドレスが必要です。</p>
      </div>
      <dl class="detail__info booking__dl">
        <dt>施設</dt><dd>${esc(b.propertyName)}・${esc(b.roomName)}</dd>
        <dt>日程</dt><dd>${esc(fmtDate(b.checkin))} 〜 ${esc(fmtDate(b.checkout))}（${b.nights}泊）</dd>
        <dt>人数</dt><dd>${b.guests}名</dd>
        <dt>料金</dt><dd>${yen(b.total)}（税込・現地払い）</dd>
      </dl>
      <div class="detail__actions">
        ${API ? "" : `<a class="btn btn--accent" href="${esc(mailHref(b))}">予約内容をホテルへメール送信</a>`}
        <button type="button" class="btn btn--ghost" data-print>予約内容を印刷する</button>
      </div>`);
  }

  function lookup(error = "", values = {}) {
    show(`
      <h2 class="detail__name" id="modalTitle">予約の確認・キャンセル</h2>
      <p class="booking__small">ご予約時の予約番号とメールアドレスを入力してください。</p>
      ${error ? `<p class="booking__error" role="alert">${esc(error)}</p>` : ""}
      <form class="bform" id="lookupForm" novalidate>
        <label class="bfield"><span>予約番号</span><input name="bookingId" value="${esc(values.bookingId)}" placeholder="R261020-XXXXX" autocomplete="off"></label>
        <label class="bfield"><span>メールアドレス</span><input type="email" name="email" value="${esc(values.email)}" autocomplete="email"></label>
        <div class="detail__actions"><button type="submit" class="btn btn--accent">予約を確認する</button></div>
      </form>`);
  }

  function renderBooking(b, askCancel = false, error = "") {
    const cancellable = b.status === "confirmed" && b.checkin >= iso(new Date());
    const statusLabel = b.status === "cancelled" ? `<span class="badge badge--off">キャンセル済み</span>` : `<span class="badge">予約確定</span>`;
    show(`
      <h2 class="detail__name" id="modalTitle">ご予約内容 ${statusLabel}</h2>
      ${error ? `<p class="booking__error" role="alert">${esc(error)}</p>` : ""}
      <dl class="detail__info booking__dl">
        <dt>予約番号</dt><dd>${esc(b.id)}</dd>
        <dt>施設</dt><dd>${esc(b.propertyName)}・${esc(b.roomName)}</dd>
        <dt>日程</dt><dd>${esc(fmtDate(b.checkin))} 〜 ${esc(fmtDate(b.checkout))}（${b.nights}泊）</dd>
        <dt>人数</dt><dd>${b.guests}名</dd>
        <dt>料金</dt><dd>${yen(b.total)}（税込）</dd>
        <dt>お名前</dt><dd>${esc(b.guest.name)} 様</dd>
      </dl>
      ${askCancel ? `<p class="booking__error" role="alert">本当にキャンセルしますか？ この操作は取り消せません。<br><small>${esc(SITE.cancelPolicy)}</small></p>` : ""}
      <div class="detail__actions">
        <button type="button" class="btn btn--ghost" data-lookup>別の予約を確認</button>
        ${cancellable ? (askCancel
          ? `<button type="button" class="btn btn--danger" data-cancel-do>キャンセルを確定する</button>`
          : `<button type="button" class="btn btn--ghost btn--danger-text" data-cancel-ask>この予約をキャンセル</button>`) : ""}
      </div>`);
  }

  const body = document.getElementById("modalBody");
  body.addEventListener("click", async (e) => {
    const t = e.target;
    const pick = t.closest("[data-pick]");
    if (pick) {
      [draft.propertyId, draft.roomId] = pick.dataset.pick.split("|");
      renderGuest();
      return;
    }
    const back = t.closest("[data-back]");
    if (back) { back.dataset.back === "rooms" ? renderRooms() : renderGuest(); return; }
    const conf = t.closest("[data-confirm]");
    if (conf) { confirm(conf); return; }
    if (t.closest("[data-print]")) { window.print(); return; }
    if (t.closest("[data-lookup]")) { lookup(); return; }
    if (t.closest("[data-cancel-ask]")) { renderBooking(current.booking, true); return; }
    const doIt = t.closest("[data-cancel-do]");
    if (doIt) {
      busy(doIt, "処理中…");
      try {
        const res = await store.cancel(current.id, current.email);
        if (!res.ok) throw new Error(res.error);
        current.booking = res.booking;
        renderBooking(res.booking);
      } catch { renderBooking(current.booking, false, NET_ERROR); }
    }
  });
  body.addEventListener("change", (e) => {
    if (e.target.id === "agree") body.querySelector("[data-confirm]").disabled = !e.target.checked;
  });
  body.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
    if (form.getAttribute("id") === "guestForm") {
      draft.guest = fd;
      const errors = validate(fd);
      if (Object.keys(errors).length) renderGuest(errors);
      else renderConfirm();
    } else if (form.getAttribute("id") === "lookupForm") {
      if (!fd.bookingId || !fd.email) { lookup("予約番号とメールアドレスを入力してください。", fd); return; }
      busy(form.querySelector("[type=submit]"), "確認中…");
      try {
        const res = await store.find(fd.bookingId, fd.email);
        if (!res.ok) { lookup("該当するご予約が見つかりません。予約番号とメールアドレスをご確認ください。", fd); return; }
        current = { id: fd.bookingId, email: fd.email, booking: res.booking };
        renderBooking(res.booking);
      } catch { lookup(NET_ERROR, fd); }
    }
  });

  window.Booking = { start, lookup };
})();
