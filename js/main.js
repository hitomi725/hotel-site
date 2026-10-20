(() => {
  const { SITE, HERO_IMAGES, PURPOSES, BRANDS, REGIONS, PROPERTIES, NEWS } = window;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const brandLabel = (id) => BRANDS.find((b) => b.id === id)?.label ?? "";
  const regionLabel = (id) => REGIONS.find((r) => r.id === id)?.label ?? "";
  const purposeLabel = (id) => PURPOSES.find((p) => p.id === id)?.label ?? "";
  const telHref = (n) => "tel:" + String(n).replace(/[^\d+]/g, "");

  // Site-wide text
  document.title = `${SITE.brand} 公式サイト`;
  $$("[data-site]").forEach((el) => { el.textContent = SITE[el.dataset.site] ?? ""; });
  $$("[data-tel]").forEach((el) => { el.href = telHref(SITE.phone); });
  $$("[data-mail]").forEach((el) => { el.href = "mailto:" + SITE.email; });
  $("#year").textContent = new Date().getFullYear();
  $("#companyTable").innerHTML = SITE.company.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");

  // Drawer
  const drawer = $("#drawer");
  const menuOpen = $("#menuOpen");
  const setDrawer = (open) => {
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    menuOpen.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("is-locked", open);
    if (open) $("#menuClose").focus();
  };
  menuOpen.addEventListener("click", () => setDrawer(true));
  $("#menuClose").addEventListener("click", () => setDrawer(false));
  drawer.addEventListener("click", (e) => { if (e.target === drawer || e.target.closest("a")) setDrawer(false); });

  // Hero slideshow
  const slides = $("#heroSlides");
  const dots = $("#heroDots");
  slides.innerHTML = HERO_IMAGES.map((src, i) => `<img src="${esc(src)}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join("");
  dots.innerHTML = HERO_IMAGES.map((_, i) => `<button role="tab" aria-label="スライド${i + 1}"></button>`).join("");
  let current = 0;
  let timer;
  const show = (i) => {
    current = (i + HERO_IMAGES.length) % HERO_IMAGES.length;
    $$("img", slides).forEach((img, n) => img.classList.toggle("is-active", n === current));
    $$("button", dots).forEach((b, n) => b.setAttribute("aria-selected", String(n === current)));
  };
  const play = () => { clearInterval(timer); timer = setInterval(() => show(current + 1), 6000); };
  $$("button", dots).forEach((b, n) => b.addEventListener("click", () => { show(n); play(); }));
  show(0);
  play();

  // Search
  const propSelect = $("#searchProperty");
  propSelect.insertAdjacentHTML("beforeend", PROPERTIES.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}（${esc(p.area)}）</option>`).join(""));
  $("#guests").innerHTML = Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}" ${i === 1 ? "selected" : ""}>${i + 1}名</option>`).join("");
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
  const today = iso(new Date());
  const checkin = $("#checkin");
  const checkout = $("#checkout");
  checkin.min = today;
  checkin.value = addDays(today, 14);
  checkout.min = addDays(checkin.value, 1);
  checkout.value = addDays(checkin.value, 1);
  checkin.addEventListener("change", () => {
    if (!checkin.value) return;
    checkout.min = addDays(checkin.value, 1);
    if (!checkout.value || checkout.value <= checkin.value) checkout.value = addDays(checkin.value, 1);
  });

  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("#searchError");
    $$(".field").forEach((f) => f.classList.remove("is-invalid"));
    let msg = "";
    if (!checkin.value || checkin.value < today) { msg = "チェックイン日を本日以降で選択してください。"; checkin.parentElement.classList.add("is-invalid"); }
    else if (!checkout.value || checkout.value <= checkin.value) { msg = "チェックアウト日はチェックイン日より後の日付を選択してください。"; checkout.parentElement.classList.add("is-invalid"); }
    err.textContent = msg;
    if (msg) return;

    const params = new URLSearchParams({ property: propSelect.value, checkin: checkin.value, checkout: checkout.value, guests: $("#guests").value });
    if (SITE.reservationUrl) { window.open(`${SITE.reservationUrl}?${params}`, "_blank", "noopener"); return; }
    window.Booking.start({ propertyId: propSelect.value, checkin: checkin.value, checkout: checkout.value, guests: $("#guests").value });
  });
  $$("[data-open-lookup]").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); setTimeout(window.Booking.lookup); }));

  // Purposes
  $("#purposeList").innerHTML = PURPOSES.map((p) => `
    <button class="purpose" data-purpose="${esc(p.id)}">
      <img src="${esc(p.img)}" alt="" loading="lazy"><span>${esc(p.label)}</span>
    </button>`).join("");
  $("#purposeList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-purpose]");
    if (!btn) return;
    state.tag = btn.dataset.purpose;
    renderCards();
    $("#find").scrollIntoView();
  });

  // News carousel
  $("#newsTrack").innerHTML = NEWS.map((n) => `
    <button class="news-card" data-open="${esc(n.propertyId)}">
      <div class="news-card__img"><img src="${esc(n.img)}" alt="" loading="lazy"></div>
      <div class="news-card__body">
        <div class="news-card__meta"><span class="tag">${esc(n.label)}</span><time>${esc(n.date)}</time></div>
        <p class="news-card__title">${esc(n.title)}</p>
      </div>
    </button>`).join("");
  $$("[data-scroll]").forEach((b) => b.addEventListener("click", () => {
    const track = $(b.dataset.scroll);
    track.scrollBy({ left: track.clientWidth * 0.8 * Number(b.dataset.dir), behavior: "smooth" });
  }));

  // Find
  const state = { tab: "region", region: "", brand: "", tag: "" };
  const renderChips = () => {
    const list = state.tab === "region" ? REGIONS : BRANDS;
    const sel = state.tab === "region" ? state.region : state.brand;
    $("#chips").innerHTML = [`<button class="chip" data-chip="" aria-pressed="${!sel}">すべて</button>`]
      .concat(list.map((x) => `<button class="chip" data-chip="${esc(x.id)}" aria-pressed="${sel === x.id}">${esc(x.label)}</button>`)).join("");
    $("#brandDesc").textContent = state.tab === "brand" && state.brand ? BRANDS.find((b) => b.id === state.brand).desc : "";
  };
  const renderCards = () => {
    const list = PROPERTIES.filter((p) =>
      (state.tab !== "region" || !state.region || p.region === state.region) &&
      (state.tab !== "brand" || !state.brand || p.brand === state.brand) &&
      (!state.tag || p.tags.includes(state.tag)));
    $("#filterNote").innerHTML = `${list.length}件の施設` + (state.tag ? ` ／「${esc(purposeLabel(state.tag))}」で絞り込み中<button data-clear-tag>解除</button>` : "");
    $("#cards").innerHTML = list.length ? list.map((p, i) => `
      <button class="card" data-open="${esc(p.id)}" style="animation-delay:${i * 60}ms">
        <div class="card__img"><img src="${esc(p.img)}" alt="" loading="lazy">${p.badge ? `<span class="card__badge">${esc(p.badge)}</span>` : ""}</div>
        <div class="card__body">
          <p class="card__brand">${esc(brandLabel(p.brand))}</p>
          <h3 class="card__name">${esc(p.name)}</h3>
          <p class="card__area">${esc(p.area)}</p>
          <p class="card__catch">${esc(p.catch)}</p>
        </div>
      </button>`).join("") : `<p class="empty">条件に合う施設が見つかりませんでした。</p>`;
  };
  const setTab = (tab) => {
    state.tab = tab;
    $$(".tabs__btn").forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    renderChips();
    renderCards();
  };
  $$(".tabs__btn").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("#chips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-chip]");
    if (!c) return;
    state[state.tab] = c.dataset.chip;
    renderChips();
    renderCards();
  });
  $("#filterNote").addEventListener("click", (e) => {
    if (e.target.closest("[data-clear-tag]")) { state.tag = ""; renderCards(); }
  });
  $$("[data-filter-brand]").forEach((a) => a.addEventListener("click", () => {
    state.brand = a.dataset.filterBrand;
    state.tag = "";
    setTab("brand");
  }));
  setTab("region");

  // Modal
  const modal = $("#modal");
  let lastFocus;
  const openModal = (html) => {
    if (!modal.classList.contains("is-open")) lastFocus = document.activeElement;
    $("#modalBody").innerHTML = html;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    $(".modal__close", modal).focus();
  };
  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    lastFocus?.focus();
  };
  window.App = { openModal, closeModal };
  $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (modal.classList.contains("is-open")) closeModal();
    else if (drawer.classList.contains("is-open")) setDrawer(false);
  });
  const openProperty = (id) => {
    const p = PROPERTIES.find((x) => x.id === id);
    if (!p) return;
    openModal(`
      <img class="detail__img" src="${esc(p.img)}" alt="">
      <div class="detail__body">
        <p class="card__brand">${esc(brandLabel(p.brand))} ／ ${esc(regionLabel(p.region))}</p>
        <h2 class="detail__name" id="modalTitle">${esc(p.name)}</h2>
        <p class="card__area">${esc(p.area)}${p.badge ? ` ・ <strong>${esc(p.badge)}</strong>` : ""}</p>
        <p class="detail__catch">${esc(p.catch)}</p>
        <p>${esc(p.desc)}</p>
        <ul class="detail__features">${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        <dl class="detail__info">
          <dt>住所</dt><dd>${esc(p.address)}</dd>
          <dt>電話</dt><dd><a href="${telHref(p.phone)}">${esc(p.phone)}</a></dd>
          <dt>こんな方に</dt><dd>${p.tags.map((t) => esc(purposeLabel(t))).join("・")}</dd>
        </dl>
        <div class="detail__actions">
          <button class="btn btn--accent" data-book="${esc(p.id)}">この施設の空室を検索</button>
          <a class="btn btn--ghost" href="${telHref(p.phone)}">電話で予約</a>
        </div>
      </div>`);
  };
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener && opener.dataset.open) { openProperty(opener.dataset.open); return; }
    if (opener && !opener.dataset.open) { $("#find").scrollIntoView(); return; }
    const book = e.target.closest("[data-book]");
    if (book) {
      propSelect.value = book.dataset.book;
      closeModal();
      $("#search").scrollIntoView();
      checkin.focus({ preventScroll: true });
    }
  });

  // Newsletter
  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#nlEmail");
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    $("#nlMsg").textContent = ok ? "ご登録ありがとうございます。確認メールをお送りしました。" : "メールアドレスの形式をご確認ください。";
    if (ok) input.value = "";
  });

  // Scroll effects
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-shown"); io.unobserve(en.target); }
  }), { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  const fab = $("#fab");
  const searchEl = $("#search");
  const navMap = [["#company", "#company"], ["#find", "#find"], ["#purpose", "#purpose"]];
  const onScroll = () => {
    const rect = searchEl.getBoundingClientRect();
    fab.classList.toggle("is-visible", rect.bottom < 0);
    const y = window.scrollY + 160;
    let active = "#top";
    for (const [sel, href] of navMap) if ($(sel).offsetTop <= y) { active = href; break; }
    $$(".subnav__item").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === active));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
