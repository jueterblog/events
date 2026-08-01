const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Build the category picker from the shared categories.js list
const picker = document.getElementById("category-picker");
CATEGORIES.forEach(cat => {
  const wrapper = document.createElement("label");
  wrapper.className = "category-option";
  wrapper.innerHTML = `<input type="checkbox" value="${cat}"><span>${cat}</span>`;
  picker.appendChild(wrapper);
});

picker.addEventListener("change", () => {
  const boxes = picker.querySelectorAll('input[type="checkbox"]');
  const checkedCount = picker.querySelectorAll('input[type="checkbox"]:checked').length;
  boxes.forEach(box => {
    box.disabled = !box.checked && checkedCount >= 3;
  });
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
    messageEl.textContent = "Please choose at least one category.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const newEvent = {
    event_name: document.getElementById("event_name").value.trim(),
    categories: selectedCategories,
    event_date: document.getElementById("event_date").value,
    start_time: document.getElementById("start_time").value,
    end_time: document.getElementById("end_time").value || null,
    description: descField.value.trim(),
    link: document.getElementById("link").value.trim() || null,
    is_free: document.getElementById("is_free").checked,
    submitter_name: document.getElementById("submitter_name").value.trim(),
    submitter_email: document.getElementById("submitter_email").value.trim(),
    status: "pending"
  };

  const { error } = await client.from("events").insert([newEvent]);

  submitBtn.disabled = false;
  submitBtn.textContent = "Submit event";

  if (error) {
    console.error(error);
    messageEl.classList.add("error");
    messageEl.textContent = "Something went wrong submitting your event. Please try again.";
    return;
  }

  messageEl.classList.add("success");
  messageEl.textContent = "Thanks! Your event has been submitted and is waiting for review. It'll appear on the site once approved.";
  document.getElementById("event-form").reset();
  charCount.textContent = "0";
});
