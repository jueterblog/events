const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allEvents = [];
let activeCategory = "all";
let filterFree = false;
let filterBarrierfrei = false;
let activeMonth = "all";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function buildFilterChips() {
  const filtersEl = document.getElementById("filters");
  CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      updateActiveChip();
      renderEvents();
    });
    filtersEl.appendChild(btn);
  });

  document.querySelector('.chip[data-category="all"]').addEventListener("click", () => {
    activeCategory = "all";
    updateActiveChip();
    renderEvents();
  });
}

function updateActiveChip() {
  document.querySelectorAll(".chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.category === activeCategory);
  });
}

function buildExtraFilters() {
  const filtersEl = document.getElementById("filters");

  const freeBtn = document.createElement("button");
  freeBtn.type = "button";
  freeBtn.className = "chip";
  freeBtn.id = "filter-free";
  freeBtn.textContent = "Kostenlos";
  freeBtn.addEventListener("click", () => {
    filterFree = !filterFree;
    freeBtn.classList.toggle("active", filterFree);
    renderEvents();
  });
  filtersEl.appendChild(freeBtn);

  const barrierfreiBtn = document.createElement("button");
  barrierfreiBtn.type = "button";
  barrierfreiBtn.className = "chip";
  barrierfreiBtn.id = "filter-barrierfrei";
  barrierfreiBtn.textContent = "Barrierfrei";
  barrierfreiBtn.addEventListener("click", () => {
    filterBarrierfrei = !filterBarrierfrei;
    barrierfreiBtn.classList.toggle("active", filterBarrierfrei);
    renderEvents();
  });
  filtersEl.appendChild(barrierfreiBtn);
}

function buildMonthFilters() {
  const monthFiltersEl = document.getElementById("month-filters");
  const monthsPresent = new Set();

  allEvents.forEach(event => {
    const d = new Date(event.event_date + "T00:00:00");
    monthsPresent.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  });

  const sortedMonths = Array.from(monthsPresent).sort();

  monthFiltersEl.innerHTML = "";
  sortedMonths.forEach(key => {
    const monthIndex = parseInt(key.split("-")[1], 10) - 1;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "month-chip";
    btn.textContent = MONTH_NAMES[monthIndex];
    btn.dataset.month = key;
    btn.addEventListener("click", () => {
      activeMonth = activeMonth === key ? "all" : key;
      updateActiveMonthChip();
      renderEvents();
    });
    monthFiltersEl.appendChild(btn);
  });
}

function updateActiveMonthChip() {
  document.querySelectorAll(".month-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.month === activeMonth);
  });
}

function formatDateBadge(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return { day, month };
}

function formatTimeRange(start, end) {
  const fmt = t => t ? t.slice(0, 5) : "";
  if (end) return `ab ${fmt(start)} bis ${fmt(end)}`;
  return `ab ${fmt(start)}`;
}

async function fetchEvents() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

  const { data, error } = await client
    .from("events")
    .select("*")
    .eq("status", "approved")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    document.getElementById("event-list").innerHTML =
      `<p style="color:var(--text)">Couldn't load events right now. Please try again later.</p>`;
    return;
  }

  allEvents = data;
  buildMonthFilters();
  renderEvents();
}

function renderEvents() {
  const listEl = document.getElementById("event-list");
  const emptyEl = document.getElementById("empty-state");
  listEl.innerHTML = "";

  let filtered = activeCategory === "all"
    ? allEvents
    : allEvents.filter(e => (e.categories || []).includes(activeCategory));

  if (filterFree) filtered = filtered.filter(e => e.is_free);
  if (filterBarrierfrei) filtered = filtered.filter(e => e.is_barrierfrei);
  if (activeMonth !== "all") {
    filtered = filtered.filter(e => {
      const d = new Date(e.event_date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === activeMonth;
    });
  }

  if (filtered.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  filtered.forEach((event, index) => {
    const { day, month } = formatDateBadge(event.event_date);

    const categoryLine = (event.categories || []).join(' · ');

    const statusLabels = [];
    if (event.is_free) statusLabels.push("kostenlos");
    if (event.is_barrierfrei) statusLabels.push("barrierefrei");
    const statusHtml = statusLabels.map(label => `<span>${label}</span>`).join('');

    const mapsQuery = encodeURIComponent(event.address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
      <div class="event-header">
        <div class="date-badge">
          <div class="day">${day}</div>
          <div class="dash">–</div>
          <div class="month">${month}</div>
        </div>
        <div class="event-title-group">
          <p class="event-cats">${escapeHtml(categoryLine)}</p>
          <h2 class="event-title">${escapeHtml(event.event_name)}</h2>
          <div class="event-meta">${formatTimeRange(event.start_time, event.end_time)} · <a class="event-link" href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(event.location)}</a></div>
        </div>
      </div>
      <div class="event-body">
        <div class="event-details">
          <p class="event-desc">${escapeHtml(event.description)}</p>
          ${event.link ? `<p style="margin:0 0 10px;"><a class="event-link" href="${escapeAttr(event.link)}" target="_blank" rel="noopener">Zur Veranstaltungsseite</a></p>` : ''}
          ${event.is_barrierfrei && event.barrierfrei_info ? `<p class="event-desc">${escapeHtml(event.barrierfrei_info)}</p>` : ''}
        </div>
        <button type="button" class="desc-toggle">mehr anzeigen</button>
      </div>
      ${statusHtml ? `<div class="event-status">${statusHtml}</div>` : ''}
    `;
    listEl.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "").replace(/"/g, "&quot;");
}

buildFilterChips();
buildExtraFilters();
fetchEvents();

document.getElementById("event-list").addEventListener("click", (e) => {
  if (!e.target.classList.contains("desc-toggle")) return;
  const details = e.target.previousElementSibling;
  const isOpen = details.classList.toggle("open");
  e.target.textContent = isOpen ? "weniger anzeigen" : "mehr anzeigen";
});
