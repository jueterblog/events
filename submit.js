const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Build the category picker from the shared categories.js list
const picker = document.getElementById("category-picker");
// Indices (0-based) after which to force a line break, so the layout
// stays Musik/Theater & Bühne/Kino/Kunst & Ausstellungen | Natur & Ausflüge/Essen & Trinken/Märkte & Feste |
// Community/Workshops/Kids | Sport & Bewegung/Other — regardless of screen width.
const CATEGORY_LINE_BREAKS = [3, 6, 9];
CATEGORIES.forEach((cat, index) => {
  const wrapper = document.createElement("label");
  wrapper.className = "category-option";
  wrapper.innerHTML = `<input type="checkbox" value="${cat}"><span>${cat}</span>`;
  picker.appendChild(wrapper);
  if (CATEGORY_LINE_BREAKS.includes(index)) {
    const breakEl = document.createElement("div");
    breakEl.className = "category-break";
    picker.appendChild(breakEl);
  }
});
picker.addEventListener("change", () => {
  const boxes = picker.querySelectorAll('input[type="checkbox"]');
  const checkedCount = picker.querySelectorAll('input[type="checkbox"]:checked').length;
  boxes.forEach(box => {
    box.disabled = !box.checked && checkedCount >= 3;
  });
});

// NEW: multi-day event toggle — shows/hides the end-date field
const multidayCheckbox = document.getElementById("is_multiday");
const endDateWrap = document.getElementById("end-date-wrap");
const endDateField = document.getElementById("event_end_date");
multidayCheckbox.addEventListener("change", () => {
  endDateWrap.style.display = multidayCheckbox.checked ? "block" : "none";
  if (!multidayCheckbox.checked) endDateField.value = "";
});

const descField = document.getElementById("description");
const charCount = document.getElementById("char-count");
descField.addEventListener("input", () => {
  charCount.textContent = descField.value.length;
});
document.getElementById("event-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("submit-btn");
  const messageEl = document.getElementById("form-message");
  messageEl.className = "form-message";
  messageEl.textContent = "";
  const selectedCategories = Array.from(
    picker.querySelectorAll('input[type="checkbox"]:checked')
  ).map(box => box.value);
  if (selectedCategories.length === 0) {
    messageEl.classList.add("error");
    messageEl.textContent = "Bitte wähle mindestens eine Kategorie aus.";
    return;
  }

  // NEW: validate end date isn't before start date, if provided
  const startDateVal = document.getElementById("event_date").value;
  const endDateVal = endDateField.value;
  if (multidayCheckbox.checked && endDateVal && endDateVal < startDateVal) {
    messageEl.classList.add("error");
    messageEl.textContent = "Das Enddatum darf nicht vor dem Startdatum liegen.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Wird gesendet...";
  const newEvent = {
    event_name: document.getElementById("event_name").value.trim(),
    categories: selectedCategories,
    event_date: startDateVal,
    event_end_date: multidayCheckbox.checked ? (endDateVal || null) : null, // NEW
    start_time: document.getElementById("start_time").value,
    end_time: document.getElementById("end_time").value || null,
    location: document.getElementById("location").value.trim(),
    address: document.getElementById("address").value.trim(),
    description: descField.value.trim(),
    link: document.getElementById("link").value.trim() || null,
    is_free: document.getElementById("is_free").checked,
    is_barrierfrei: document.getElementById("is_barrierfrei").checked,
    barrierfrei_info: document.getElementById("barrierfrei_info").value.trim(),
    submitter_name: document.getElementById("submitter_name").value.trim(),
    submitter_email: document.getElementById("submitter_email").value.trim(),
    status: "pending"
  };
  const { error } = await client.from("events").insert([newEvent]);
  submitBtn.disabled = false;
  submitBtn.textContent = "Event einreichen";
  if (error) {
    console.error(error);
    messageEl.classList.add("error");
    messageEl.textContent = "Beim Einreichen ist etwas schiefgelaufen. Bitte versuch es noch einmal.";
    return;
  }
  messageEl.classList.add("success");
  messageEl.textContent = "Danke! Dein Event wurde eingereicht und wird geprüft. Es erscheint auf der Website, sobald es freigegeben wurde.";
  document.getElementById("event-form").reset();
  charCount.textContent = "0";
  endDateWrap.style.display = "none"; // NEW: reset the toggle on successful submit
});
