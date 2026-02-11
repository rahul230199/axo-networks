/* =========================================================
   AXO RFQ DETAIL – ENTERPRISE PRODUCTION JS
========================================================= */

/* ================= AUTH ================= */

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem("token");
}

/* ================= AUTH GUARD ================= */

(function authGuard() {
  const user = getUser();
  const token = getToken();

  if (!user || !token) {
    window.location.href = "/frontend/login.html";
  }
})();

/* ================= GLOBAL STATE ================= */

let rfqId = null;
let currentUser = getUser();

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  document.getElementById("userEmail").textContent = currentUser.email;

  rfqId = getRFQIdFromURL();
  if (!rfqId) return showError("Invalid RFQ ID");

  await loadRFQDetails();
  await loadFiles();
  await loadQuotes();
  await loadMessages();

  document
    .getElementById("sendMessageBtn")
    .addEventListener("click", sendMessage);
});

/* =========================================================
   LOAD RFQ CORE DETAILS
========================================================= */

async function loadRFQDetails() {

  try {
    const res = await fetchAPI(`/api/rfqs/${rfqId}`);

    const rfq = res;

    setText("rfqPartName", rfq.part_name);
    setText("rfqId", rfq.id);
    setText("rfqCreated", formatDate(rfq.created_at));

    setText("detailPartId", rfq.part_id);
    setText("detailTotalQty", rfq.total_quantity);
    setText("detailBatchQty", rfq.batch_quantity);
    setText("detailTargetPrice", rfq.target_price || "-");
    setText("detailDelivery", rfq.delivery_timeline);
    setText("detailPpap", rfq.ppap_level);
    setText("detailMaterial", rfq.material_specification);

    setStatusBadge(rfq.status);

  } catch {
    showError("Unable to load RFQ details.");
  }
}

/* =========================================================
   LOAD FILES
========================================================= */

async function loadFiles() {

  try {
    const files = await fetchAPI(`/api/rfq-files/${rfqId}`);

    const list = document.getElementById("rfqFilesList");
    list.innerHTML = "";

    if (!files.length) {
      list.innerHTML = "<li>No documents uploaded</li>";
      return;
    }

    files.forEach(file => {

      const li = document.createElement("li");

      li.innerHTML = `
        <a href="${escapeHTML(file.file_url)}" target="_blank">
          ${escapeHTML(file.file_name)}
        </a>
      `;

      list.appendChild(li);
    });

  } catch {
    showError("Unable to load files.");
  }
}

/* =========================================================
   LOAD QUOTES
========================================================= */

async function loadQuotes() {

  try {
    const quotes = await fetchAPI(`/api/quotes/rfq/${rfqId}`);

    const tbody = document.getElementById("quotesTableBody");
    const countLabel = document.getElementById("quoteCount");

    tbody.innerHTML = "";
    countLabel.textContent = `${quotes.length} Quotes`;

    if (!quotes.length) {
      tbody.innerHTML =
        `<tr><td colspan="6">No quotes submitted yet</td></tr>`;
      return;
    }

    quotes.forEach(quote => {

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${escapeHTML(quote.supplier_id)}</td>
        <td>${escapeHTML(quote.price)}</td>
        <td>${escapeHTML(quote.batch_quantity)}</td>
        <td>${escapeHTML(quote.delivery_timeline)}</td>
        <td>${escapeHTML(quote.status)}</td>
        <td>
          ${renderQuoteAction(quote)}
        </td>
      `;

      tbody.appendChild(row);
    });

  } catch {
    showError("Unable to load quotes.");
  }
}

/* =========================================================
   LOAD MESSAGES
========================================================= */

async function loadMessages() {

  try {
    const messages = await fetchAPI(`/api/rfq-messages/${rfqId}`);

    const container = document.getElementById("messagesContainer");
    container.innerHTML = "";

    if (!messages.length) {
      container.innerHTML = "<div>No messages yet</div>";
      return;
    }

    messages.forEach(msg => {

      const div = document.createElement("div");
      div.className = "message-row";

      div.innerHTML = `
        <strong>User ${escapeHTML(msg.sender_id)}</strong>
        <p>${escapeHTML(msg.message)}</p>
      `;

      container.appendChild(div);
    });

  } catch {
    showError("Unable to load messages.");
  }
}

/* =========================================================
   ACCEPT QUOTE
========================================================= */

function renderQuoteAction(quote) {

  if (currentUser.role.toLowerCase() !== "buyer") return "-";
  if (quote.status === "accepted") return "Accepted";

  return `
    <button class="primary-btn"
      onclick="acceptQuote(${quote.id}, ${quote.supplier_id}, ${quote.price})">
      Accept
    </button>
  `;
}

async function acceptQuote(quoteId, supplierId, price) {

  try {
    await fetchAPI("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({
        rfq_id: rfqId,
        quote_id: quoteId,
        buyer_id: currentUser.id,
        supplier_id: supplierId,
        quantity: 1,
        price: price
      })
    });

    await loadQuotes();

  } catch {
    showError("Unable to accept quote.");
  }
}

/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (!text) return;

  try {

    await fetchAPI("/api/rfq-messages", {
      method: "POST",
      body: JSON.stringify({
        rfq_id: rfqId,
        message: sanitize(text)
      })
    });

    input.value = "";
    await loadMessages();

  } catch {
    showError("Message failed to send.");
  }
}

/* =========================================================
   API WRAPPER
========================================================= */

async function fetchAPI(url, options = {}) {

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Authorization": `Bearer ${getToken()}`,
      "Content-Type": "application/json"
    },
    body: options.body
  });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "/frontend/login.html";
    return;
  }

  if (!response.ok) {
    throw new Error("Network error");
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.message);

  return data.data || data;
}

/* =========================================================
   HELPERS
========================================================= */

function getRFQIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setStatusBadge(status) {
  const badge = document.getElementById("rfqStatus");
  badge.textContent = status.toUpperCase();
  badge.className = `status-badge ${status}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function escapeHTML(str) {
  return String(str).replace(/[<>&"']/g, "");
}

function sanitize(str) {
  return String(str).replace(/[<>&"']/g, "");
}

function showError(message) {
  console.error(message);
}

/* =========================================================
   NAVIGATION
========================================================= */

function goBack() {
  window.location.href = "/frontend/buyer-dashboard.html";
}

function logout() {
  localStorage.clear();
  window.location.href = "/frontend/login.html";
}
