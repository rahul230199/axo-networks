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
        id: 1,
        email: "buyer.local@axonetworks.com",
        role: "BUYER"
      })
    );
    localStorage.setItem("token", "LOCAL_DEV_TOKEN");
  }
}

/* ---------------- PROD MODE ---------------- */
if (!IS_LOCAL) {
  if (!getUser() || !getToken()) {
    window.location.href = "/login";
  }
}

/* =========================================================
   RFQ ID
========================================================= */
const params = new URLSearchParams(window.location.search);
const RFQ_ID = params.get("id");

if (!RFQ_ID) {
  showMessage("Invalid RFQ reference", "error");
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", loadRFQDetail);

/* =========================================================
   LOAD DATA
========================================================= */
async function loadRFQDetail() {
  try {
    clearMessage();

    let rfq, files, quotes, messages;

    if (IS_LOCAL) {
      ({ rfq, files, quotes, messages } = getMockData());
    } else {
      [rfq, files, quotes, messages] = await Promise.all([
        api(`/api/rfqs/${RFQ_ID}`),
        api(`/api/rfqs/${RFQ_ID}/files`),
        api(`/api/quotes/rfq/${RFQ_ID}`),
        api(`/api/rfq-messages/${RFQ_ID}`)
      ]);
    }

    renderRFQ(rfq);
    renderFiles(files);
    renderQuotes(quotes);
    renderMessages(messages);

    hideSkeletons();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to load RFQ details", "error");
  }
}

/* =========================================================
   API HELPER
========================================================= */
async function api(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.message);
  return result.data;
}

/* =========================================================
   RENDER RFQ
========================================================= */
function renderRFQ(rfq) {
  if (rfq.status === "po_issued" && rfq.purchase_order) {
  const po = rfq.purchase_order;

  document.getElementById("poSection").style.display = "block";
  document.getElementById("poId").textContent = po.id;
  document.getElementById("poQty").textContent = po.quantity;
  document.getElementById("poPrice").textContent = `₹${po.price}`;
}
  setText("rfqId", rfq.id);
  setText("partName", rfq.part_name);
  setText("totalQty", rfq.total_quantity);

  const status = document.getElementById("rfqStatus");
  status.textContent = formatStatus(rfq.status);
  status.className = `status-badge ${rfq.status}`;

  setText("deliveryTimeline", rfq.delivery_timeline);
  setText("ppapLevel", rfq.ppap_level || "-");
  setText("materialSpec", rfq.material_specification || "-");
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
   QUOTES (POLISHED)
========================================================= */
function renderQuotes(quotes) {
  const container = document.getElementById("quotesContainer");
  container.innerHTML = "";

  if (!quotes.length) {
    container.innerHTML = `<p class="muted">No quotes received yet</p>`;
    return;
  }

  quotes.forEach(q => {
    container.innerHTML += `
      <div class="quote-card">
        <div class="quote-head">
          Supplier #${q.supplier_name || q.supplier_id}
        </div>

        <div class="quote-grid">
          <div>
            <span>Price</span>
            <strong>₹${q.price}</strong>
          </div>
          <div>
            <span>Qty</span>
            <strong>${q.batch_quantity}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>${q.delivery_timeline}</strong>
          </div>
        </div>

        <div class="quote-action">
          ${
            q.status === "submitted"
              ? `<button class="accept-btn" onclick="acceptQuote(${q.id})">
                   Accept Quote
                 </button>`
              : `<span class="status-badge closed">Accepted</span>`
          }
        </div>
      </div>
    `;
  });
}

/* =========================================================
   MESSAGES
========================================================= */
function renderMessages(messages) {
  const box = document.getElementById("messageList");
  box.innerHTML = "";

  messages.forEach(m => {
    box.innerHTML += `
      <div class="message ${m.sender_id === getUser().id ? "you" : "other"}">
        ${m.message}
      </div>
    `;
  });
}

/* =========================================================
   ACTIONS
========================================================= */
async function acceptQuote(quoteId) {
  try {
    clearMessage();

    if (IS_LOCAL) {
      simulatePO();
      showMessage("Quote accepted. PO created.", "success");
      return;
    }

    const res = await fetch(`/api/quotes/${quoteId}/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    showMessage("Quote accepted. Purchase Order issued.", "success");

    // Reload RFQ details (status, PO, quotes)
    loadRFQDetail();

  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to accept quote", "error");
  }
}


async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  try {
    if (IS_LOCAL) {
      input.value = "";
      showMessage("Message sent (Local Mode)", "success");
      return;
    }

    const res = await fetch(`/api/rfq-messages/${RFQ_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ message: text })
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    input.value = "";
    loadRFQDetail();
  } catch (err) {
    showMessage(err.message || "Failed to send message", "error");
  }
}

/* =========================================================
   HELPERS
========================================================= */
function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("skeleton");
  el.textContent = value;
}

function formatStatus(status) {
  return status.replace("_", " ").toUpperCase();
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
function simulatePO() {
  document.getElementById("poSection").style.display = "block";

  document.getElementById("poId").textContent = "PO-LOCAL-001";
  document.getElementById("poQty").textContent = "5000";
  document.getElementById("poPrice").textContent = "₹120 / unit";
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

  setTimeout(() => (box.style.display = "none"), 4000);
}

function clearMessage() {
  const box = document.getElementById("statusMessage");
  if (box) box.style.display = "none";
}

/* =========================================================
   MOCK DATA
========================================================= */
function getMockData() {
  return {
    rfq: {
      id: RFQ_ID,
      part_name: "Aluminium Housing",
      total_quantity: 5000,
      delivery_timeline: "4-6 Weeks",
      ppap_level: "Level 3",
      material_specification: "ADC12 Aluminium",
      status: "quoted"
    },
    files: [{ file_name: "drawing.pdf", file_url: "#" }],
    quotes: [
      {
        id: 1,
        supplier_id: 22,
        price: 120,
        batch_quantity: 1000,
        delivery_timeline: "5 weeks",
        status: "submitted"
      }
    ],
    messages: [
      { sender_id: 1, message: "Please confirm tooling cost." },
      { sender_id: 22, message: "Tooling included in price." }
    ]
  };
}
