const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allEvents = [];
let activeCategory = "all";

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
  const today = new Date().toISOString().split("T")[0];

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
  renderEvents();
}

function renderEvents() {
  const listEl = document.getElementById("event-list");
  const emptyEl = document.getElementById("empty-state");
  listEl.innerHTML = "";

  const filtered = activeCategory === "all"
    ? allEvents
    : allEvents.filter(e => (e.categories || []).includes(activeCategory));

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
      <div class="date-badge">
        <div class="day">${day}</div>
        <div class="dash">–</div>
        <div class="month">${month}</div>
      </div>
      <div class="event-body">
        <p class="event-cats">${escapeHtml(categoryLine)}</p>
        <div class="event-top-row">
          <h2 class="event-title">${escapeHtml(event.event_name)}</h2>
        </div>
        <div class="event-meta">${formatTimeRange(event.start_time, event.end_time)} · <a class="event-link" href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(event.location)}</a></div>
        <div class="event-details">
          <p class="event-desc">${escapeHtml(event.description)}</p>
          ${event.link ? `<p style="margin:0 0 10px;"><a class="event-link" href="${escapeAttr(event.link)}" target="_blank" rel="noopener">mehr Infos hier</a></p>` : ''}
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
fetchEvents();

document.getElementById("event-list").addEventListener("click", (e) => {
  if (!e.target.classList.contains("desc-toggle")) return;
  const details = e.target.previousElementSibling;
  const isOpen = details.classList.toggle("open");
  e.target.textContent = isOpen ? "weniger anzeigen" : "mehr anzeigen";
});
