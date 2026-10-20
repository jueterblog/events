const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WEEKDAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const WEEKDAYS_ADV = ["Sonntags", "Montags", "Dienstags", "Mittwochs", "Donnerstags", "Freitags", "Samstags"];

const RECURRENCE_LABELS = {
  weekly: "Wöchentlich",
  biweekly: "Alle 2 Wochen",
  monthly: "Monatlich",
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
function escapeAttr(str) {
  return (str || "").replace(/"/g, "&quot;");
}

// "Jeden Freitag" (weekly), "Freitags" (every 2 weeks), "Am 15. jedes Monats" (monthly)
function formatWhen(ev) {
  const d = new Date(ev.event_date + "T00:00:00");
  let day;
  if (ev.recurrence === "monthly") day = `Am ${d.getDate()}. jedes Monats`;
  else if (ev.recurrence === "biweekly") day = WEEKDAYS_ADV[d.getDay()];
  else day = `Jeden ${WEEKDAYS_LONG[d.getDay()]}`;

  const fmt = t => (t ? t.slice(0, 5) : "");
  let time = "";
  if (ev.start_time) time = ev.end_time ? `${fmt(ev.start_time)}–${fmt(ev.end_time)} Uhr` : `ab ${fmt(ev.start_time)} Uhr`;
  return time ? `${day}, ${time}` : day;
}

// Same pattern as the newsletter: NAME (Ort) — the location links to the address.
function titleHtml(ev) {
  const loc = (ev.location || "").trim();
  const name = `<span class="offer-name">${escapeHtml(ev.event_name)}</span>`;
  if (!loc) return name;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.address || loc)}`;
  const link = `<a class="event-link" href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(loc)}</a>`;
  return loc.includes("(") ? `${name} – ${link}` : `${name} (${link})`;
}

function cardHtml(ev, key) {
  const cats = (ev.categories || []).join(" · ");
  const tags = [ev.is_free && "Kostenlos", ev.is_barrierfrei && "Barrierefrei"].filter(Boolean).join(" – ");
  const hasDetails = ev.description || ev.link || (ev.is_barrierfrei && ev.barrierfrei_info);

  return `
    <div class="offer-body">
      <p class="offer-title">${titleHtml(ev)}</p>
      <p>${escapeHtml(formatWhen(ev))}</p>
      ${cats ? `<p class="offer-cats">${escapeHtml(cats)}</p>` : ""}
      ${tags ? `<p>${tags}</p>` : ""}
      <p class="offer-rec">${RECURRENCE_LABELS[ev.recurrence] || ""}</p>
      ${hasDetails ? `
        <div class="offer-details" hidden>
          ${ev.description ? `<p class="event-desc">${escapeHtml(ev.description)}</p>` : ""}
          ${ev.is_barrierfrei && ev.barrierfrei_info ? `<p class="event-desc">${escapeHtml(ev.barrierfrei_info)}</p>` : ""}
          ${ev.link ? `<p><a class="event-link" href="${escapeAttr(ev.link)}" target="_blank" rel="noopener">Zur Veranstaltungsseite</a></p>` : ""}
        </div>
        <p><button type="button" class="offer-more" aria-expanded="false">Mehr Info</button></p>` : ""}
    </div>`;
}

async function loadOffers() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const listEl = document.getElementById("offer-list");
  const emptyEl = document.getElementById("empty-state");

  // Every recurring event is stored as one row per date. Here we collapse each
  // series (same recurrence_group_id) into a single card, using its next date.
  const { data, error } = await client
    .from("events")
    .select("*")
    .eq("status", "approved")
    .not("recurrence", "is", null)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching Immer wieder:", error);
    listEl.innerHTML = `<p style="color:var(--text)">Die Seite konnte gerade nicht geladen werden. Bitte versuch es später noch einmal.</p>`;
    return;
  }

  const seen = new Set();
  const offers = [];
  (data || []).forEach(ev => {
    const key = ev.recurrence_group_id || ev.id;
    if (seen.has(key)) return;
    seen.add(key);
    offers.push({ ev, key });
  });

  if (offers.length === 0) { emptyEl.style.display = "block"; return; }

  offers.forEach(({ ev, key }) => {
    const card = document.createElement("article");
    card.className = "event-card";
    card.id = `angebot-${key}`;
    card.innerHTML = cardHtml(ev, key);
    listEl.appendChild(card);
  });

  openHashOffer();
}

function toggleOffer(btn) {
  const details = btn.parentElement.previousElementSibling;
  const open = details.hasAttribute("hidden");
  details.toggleAttribute("hidden", !open);
  btn.setAttribute("aria-expanded", String(open));
  btn.textContent = open ? "Weniger Info" : "Mehr Info";
}

// immer-wieder.html#angebot-<id> opens and scrolls to that card
function openHashOffer() {
  if (!location.hash) return;
  const el = document.getElementById(location.hash.slice(1));
  if (!el) return;
  const btn = el.querySelector(".offer-more");
  if (btn && btn.getAttribute("aria-expanded") === "false") toggleOffer(btn);
  setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
}

document.getElementById("offer-list").addEventListener("click", e => {
  if (e.target.classList.contains("offer-more")) toggleOffer(e.target);
});

loadOffers();
