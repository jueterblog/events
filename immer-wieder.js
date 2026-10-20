const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// weekday: 1 = Montag ... 7 = Sonntag
const DAYS = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const DAYS_ADV = ["", "Montags", "Dienstags", "Mittwochs", "Donnerstags", "Freitags", "Samstags", "Sonntags"];
const NTH = { "1": "ersten", "2": "zweiten", "3": "dritten", "4": "vierten", "last": "letzten" };
const RECURRENCE_LABELS = { weekly: "Wöchentlich", biweekly: "Alle 2 Wochen", monthly: "Monatlich" };

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
function escapeAttr(str) {
  return (str || "").replace(/"/g, "&quot;");
}

// "Jeden Freitag" / "Freitags" (every 2 weeks) / "Jeden letzten Donnerstag im Monat",
// or the custom wording from the admin; the time is always appended.
function formatWhen(o) {
  const day = DAYS[o.weekday];
  let when;
  if (o.when_override) when = o.when_override;
  else if (o.recurrence === "monthly") when = NTH[o.month_week] ? `Jeden ${NTH[o.month_week]} ${day} im Monat` : `${DAYS_ADV[o.weekday]}, monatlich`;
  else if (o.recurrence === "biweekly") when = DAYS_ADV[o.weekday];
  else when = `Jeden ${day}`;

  const fmt = t => (t ? t.slice(0, 5) : "");
  let time = "";
  if (o.start_time) time = o.end_time ? `${fmt(o.start_time)}–${fmt(o.end_time)} Uhr` : `ab ${fmt(o.start_time)} Uhr`;
  return time ? `${when}, ${time}` : when;
}

// NAME (Ort): the location links to the address
function titleHtml(o) {
  const loc = (o.location || "").trim();
  const name = `<span class="offer-name">${escapeHtml(o.name)}</span>`;
  if (!loc) return name;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address || loc)}`;
  const link = `<a class="event-link" href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(loc)}</a>`;
  return loc.includes("(") ? `${name} – ${link}` : `${name} (${link})`;
}

function cardHtml(o) {
  const cats = (o.categories || []).join(" · ");
  const tags = [o.is_free && "Kostenlos", o.is_barrierfrei && "Barrierefrei"].filter(Boolean).join(" – ");
  const hasDetails = o.description || o.link || (o.is_barrierfrei && o.barrierfrei_info);
  return `
    <div class="offer-body">
      <p class="offer-title">${titleHtml(o)}</p>
      <p>${escapeHtml(formatWhen(o))}</p>
      ${cats ? `<p class="offer-cats">${escapeHtml(cats)}</p>` : ""}
      ${tags ? `<p>${tags}</p>` : ""}
      <p class="offer-rec">${RECURRENCE_LABELS[o.recurrence] || ""}</p>
      ${hasDetails ? `
        <div class="offer-details" hidden>
          ${o.description ? `<p class="event-desc">${escapeHtml(o.description)}</p>` : ""}
          ${o.is_barrierfrei && o.barrierfrei_info ? `<p class="event-desc">${escapeHtml(o.barrierfrei_info)}</p>` : ""}
          ${o.link ? `<p><a class="event-link" href="${escapeAttr(o.link)}" target="_blank" rel="noopener">Zur Veranstaltungsseite</a></p>` : ""}
        </div>
        <p><button type="button" class="offer-more" aria-expanded="false">Mehr Info</button></p>` : ""}
    </div>`;
}

async function loadPage() {
  const listEl = document.getElementById("offer-list");
  const emptyEl = document.getElementById("empty-state");

  const { data, error } = await client
    .from("immer_wieder")
    .select("*")
    .eq("active", true)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading Immer wieder:", error);
    listEl.innerHTML = `<p style="color:var(--text)">Die Seite konnte gerade nicht geladen werden. Bitte versuch es später noch einmal.</p>`;
    return;
  }
  if (!data || data.length === 0) { emptyEl.style.display = "block"; return; }

  // One section per weekday, Montag first
  for (let day = 1; day <= 7; day++) {
    const items = data.filter(o => o.weekday === day);
    if (!items.length) continue;
    const h = document.createElement("h2");
    h.className = "day-heading";
    h.textContent = DAYS[day];
    listEl.appendChild(h);
    items.forEach(o => {
      const card = document.createElement("article");
      card.className = "event-card";
      card.id = `immer-wieder-${o.id}`;
      card.innerHTML = cardHtml(o);
      listEl.appendChild(card);
    });
  }
  openHashOffer();
}

function toggleOffer(btn) {
  const details = btn.parentElement.previousElementSibling;
  const open = details.hasAttribute("hidden");
  details.toggleAttribute("hidden", !open);
  btn.setAttribute("aria-expanded", String(open));
  btn.textContent = open ? "Weniger Info" : "Mehr Info";
}

// immer-wieder.html#immer-wieder-<id> opens and scrolls to that card
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

loadPage();
