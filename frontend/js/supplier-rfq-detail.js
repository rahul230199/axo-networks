/* =========================================================
   ENV MODE CONFIG
========================================================= */

const ENV = "local"; // "local" | "prod"
const IS_LOCAL = ENV === "local";

/* =========================================================
   AUTH / USER
========================================================= */

function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}

function getToken() {
  return localStorage.getItem("token");
}

/* ---------------- LOCAL MODE ---------------- */
if (IS_LOCAL) {
  if (!getUser()) {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: 22,
        email: "supplier.local@axonetworks.com",
        role: "SUPPLIER"
      })
    );
    localStorage.setItem("token", "LOCAL_SUPPLIER_TOKEN");
  }
}

/* ---------------- PROD MODE ---------------- */
if (!IS_LOCAL) {
  if (!getUser() || !getToken()) {
    window.location.href = "/login";
  }
}

/* =========================================================
   RFQ ID FROM URL
========================================================= */

const params = new URLSearchParams(window.location.search);
const RFQ_ID = params.get("id");

if (!RFQ_ID) {
  showMessage("Invalid RFQ reference", "error");
}

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("quoteForm")
    .addEventListener("submit", submitQuote);

  loadRFQDetail();
});

/* =========================================================
   LOAD RFQ DETAIL
========================================================= */

async function loadRFQDetail() {
  try {
    clearMessage();

    let rfq, files, messages, quote;

    if (IS_LOCAL) {
      ({ rfq, files, messages, quote } = getMockData());
    } else {
      [rfq, files, messages, quote] = await Promise.all([
        fetchRFQ(),
        fetchFiles(),
        fetchMessages(),
        fetchMyQuote()
      ]);
    }

    renderRFQ(rfq);
    renderFiles(files);
    renderMessages(messages);
    renderQuoteState(quote);

    hideSkeletons();

  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to load RFQ details", "error");
  }
}

/* =========================================================
   API FETCHERS (PROD)
========================================================= */

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {})
    },
    ...options
  });

  const result = await res.json();
  if (!result.success) throw new Error(result.message);
  return result.data;
}

const fetchRFQ = () => api(`/api/rfqs/${RFQ_ID}`);
const fetchFiles = () => api(`/api/rfqs/${RFQ_ID}/files`);
const fetchMessages = () => api(`/api/rfq-messages/${RFQ_ID}`);
const fetchMyQuote = () => api(`/api/quotes/rfq/${RFQ_ID}/me`);

/* =========================================================
   RENDER RFQ
========================================================= */

function renderRFQ(rfq) {
  setText("rfqId", rfq.id);
  setText("partName", rfq.part_name);
  setText("totalQty", rfq.total_quantity);
  setText("deliveryTimeline", rfq.delivery_timeline || "-");
  setText("ppapLevel", rfq.ppap_level || "-");
  setText("materialSpec", rfq.material_specification || "-");

  const status = document.getElementById("rfqStatus");
  status.textContent = formatStatus(rfq.status);
  status.className = `status-badge ${rfq.status}`;
}

/* =========================================================
   FILES
========================================================= */

function renderFiles(files) {
  const list = document.getElementById("fileList");
  list.innerHTML = "";

  if (!files.length) {
    list.innerHTML = "<li>No files uploaded</li>";
    return;
  }

  files.forEach(f => {
    list.innerHTML += `
      <li class="file">
        <a href="${f.file_url}" target="_blank">${f.file_name}</a>
      </li>
    `;
  });
}

/* =========================================================
   QUOTE STATE
========================================================= */

function renderQuoteState(quote) {
  const form = document.getElementById("quoteForm");
  if (!quote) return;

  form.querySelectorAll("input, textarea, button").forEach(el => {
    el.disabled = true;
  });

  showMessage(
    quote.status === "accepted"
      ? "Your quote has been accepted. PO issued."
      : "You have already submitted a quote.",
    "success"
  );
}

/* =========================================================
   SUBMIT QUOTE
========================================================= */

async function submitQuote(e) {
  e.preventDefault();
  clearMessage();

  const payload = {
    rfq_id: RFQ_ID,
    supplier_id: getUser().id,
    price: Number(getValue("price")),
    batch_quantity: Number(getValue("batchQty")),
    delivery_timeline: getValue("quoteTimeline"),
    certifications: getValue("certifications")
  };

  const error = validateQuote(payload);
  if (error) {
    showMessage(error, "error");
    return;
  }

  try {
    if (IS_LOCAL) {
      showMessage("Quote submitted (LOCAL MODE)", "success");
      renderQuoteState({ status: "submitted" });
      return;
    }

    await api("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showMessage("Quote submitted successfully", "success");
    loadRFQDetail();

  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to submit quote", "error");
  }
}

/* =========================================================
   MESSAGES
========================================================= */

function renderMessages(messages) {
  const box = document.getElementById("messageList");
  box.innerHTML = "";

  if (!messages.length) return;

  messages.forEach(m => {
    box.innerHTML += `
      <div class="message ${
        m.sender_id === getUser().id ? "supplier" : "buyer"
      }">
        ${m.message}
      </div>
    `;
  });
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  try {
    if (IS_LOCAL) {
      input.value = "";
      showMessage("Message sent (LOCAL MODE)", "success");
      return;
    }

    await api(`/api/rfq-messages/${RFQ_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    input.value = "";
    loadRFQDetail();

  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to send message", "error");
  }
}

/* =========================================================
   HELPERS
========================================================= */

function getValue(id) {
  return document.getElementById(id)?.value.trim();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("skeleton");
  el.textContent = value;
}

function formatStatus(status) {
  return status.replace("_", " ").toUpperCase();
}

function validateQuote(q) {
  if (!q.price || q.price <= 0) return "Price must be greater than 0";
  if (!q.batch_quantity || q.batch_quantity <= 0)
    return "Batch quantity must be greater than 0";
  if (!q.delivery_timeline) return "Delivery timeline is required";
  return null;
}

function hideSkeletons() {
  document.querySelectorAll(".skeleton").forEach(el => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 300);
  });
}

function goBack() {
  window.history.back();
}

/* =========================================================
   STATUS MESSAGE
========================================================= */

function showMessage(text, type = "error") {
  const box = document.getElementById("statusMessage");
  if (!box) return;

  box.textContent = text;
  box.className = `status-message ${type}`;
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 4000);
}

function clearMessage() {
  const box = document.getElementById("statusMessage");
  if (box) box.style.display = "none";
}

/* =========================================================
   MOCK DATA (LOCAL MODE)
========================================================= */

function getMockData() {
  return {
    rfq: {
      id: RFQ_ID,
      part_name: "Aluminium Housing",
      total_quantity: 5000,
      delivery_timeline: "4–6 Weeks",
      ppap_level: "Level 3",
      material_specification: "ADC12 Aluminium",
      status: "active"
    },
    files: [
      { file_name: "drawing.pdf", file_url: "#" }
    ],
    messages: [
      { sender_id: 1, message: "Please share tooling details." },
      { sender_id: 22, message: "Tooling is included in price." }
    ],
    quote: null
  };
}
