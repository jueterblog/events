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
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return { weekday, day, month };
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
      `<p style="color:var(--text-soft)">Couldn't load events right now. Please try again later.</p>`;
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
    const { weekday, day, month } = formatDateBadge(event.event_date);

    const catParts = (event.categories || []).map(cat => cat);
    if (event.is_free) catParts.push("kostenlos");
    const categoryLine = catParts.join(' · ');

    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
      <div class="date-badge-outer">
        <div class="date-badge">
          <div class="weekday">${weekday}</div>
          <div class="day">${day}</div>
          <div class="month">${month}</div>
        </div>
      </div>
      <div class="event-body">
        <div class="event-top-row">
          <h2 class="event-title">${escapeHtml(event.event_name)}</h2>
        </div>
        <p class="event-cats">${escapeHtml(categoryLine)}</p>
        <div class="event-meta">${formatTimeRange(event.start_time, event.end_time)}</div>
        <p class="event-desc">${escapeHtml(event.description)}</p>
        ${event.link ? `<a class="event-link" href="${escapeAttr(event.link)}" target="_blank" rel="noopener">mehr Infos hier</a>` : ''}
      </div>
    `;
    listEl.appendChild(card);

    if (index < filtered.length - 1) {
      const divider = document.createElement("div");
      divider.className = "event-divider";
      listEl.appendChild(divider);
    }
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
