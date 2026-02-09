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
   MOCK DATA (LOCAL ONLY)
========================================================= */
const MOCK_RFQS = [
  { id: 101, buyer_id: 1, part_name: "Aluminium Housing", total_quantity: 5000, status: "draft" },
  { id: 102, buyer_id: 1, part_name: "PCB Assembly", total_quantity: 12000, status: "active" },
  { id: 103, buyer_id: 1, part_name: "Plastic Enclosure", total_quantity: 8000, status: "quoted" },
  { id: 104, buyer_id: 1, part_name: "Metal Bracket", total_quantity: 3000, status: "po_issued" }
];

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  document.getElementById("userEmail").innerText = user.email;

  const createBtn = document.getElementById("createRfqBtn");
  if (createBtn) {
    createBtn.addEventListener("click", goToCreateRFQ);
  }

  setTimeout(loadDashboard, IS_LOCAL ? 1200 : 0);
});

/* =========================================================
   LOAD DASHBOARD
========================================================= */
async function loadDashboard() {
  try {
    clearMessage();

    let rfqs = IS_LOCAL
      ? MOCK_RFQS.filter(r => r.buyer_id === getUser().id)
      : await fetchRFQsFromDB();

    renderSummary(rfqs);
    renderPipeline(rfqs);
    renderTable(rfqs);
    hideSkeletons();
  } catch (err) {
    console.error(err);
    showMessage("Failed to load dashboard", "error");
  }
}

/* =========================================================
   API – PROD
========================================================= */
async function fetchRFQsFromDB() {
  const buyerId = getUser().id;

  const res = await fetch(`/api/rfqs/buyer/${buyerId}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });

  const result = await res.json();
  if (!result.success) throw new Error(result.message);
  return result.data;
}

/* =========================================================
   SUMMARY
========================================================= */
function renderSummary(rfqs) {
  document.getElementById("summarySection").innerHTML = `
    <div class="card"><h3>Total RFQs</h3><p>${rfqs.length}</p></div>
    <div class="card"><h3>Active RFQs</h3><p>${count(rfqs, "active")}</p></div>
    <div class="card"><h3>Quotes Received</h3><p>${count(rfqs, "quoted")}</p></div>
    <div class="card"><h3>Purchase Orders</h3><p>${count(rfqs, "po_issued")}</p></div>
  `;
}

function count(arr, status) {
  return arr.filter(r => r.status === status).length;
}

/* =========================================================
   PIPELINE
========================================================= */
function renderPipeline(rfqs) {
  setPipeline("draftCount", count(rfqs, "draft"));
  setPipeline("activeCount", count(rfqs, "active"));
  setPipeline("quotesCount", count(rfqs, "quoted"));
  setPipeline("poCount", count(rfqs, "po_issued"));
}

function setPipeline(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove("skeleton");
  animateCount(el, value);
}

function animateCount(el, value) {
  let current = 0;
  const step = Math.max(1, Math.ceil(value / 15));

  const timer = setInterval(() => {
    current += step;
    if (current >= value) {
      el.textContent = value;
      clearInterval(timer);
    } else {
      el.textContent = current;
    }
  }, 20);
}

/* =========================================================
   TABLE
========================================================= */
function renderTable(rfqs) {
  const tbody = document.getElementById("rfqTableBody");
  tbody.innerHTML = "";

  if (!rfqs.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No RFQs found</td></tr>`;
    return;
  }

  rfqs.forEach(rfq => {
    tbody.innerHTML += `
      <tr>
        <td>${rfq.id}</td>
        <td>${rfq.part_name}</td>
        <td>${rfq.total_quantity}</td>
        <td>
          <span class="status ${mapStatusClass(rfq.status)}">
            ${formatStatus(rfq.status)}
          </span>
        </td>
        <td>
          <button class="view-btn" onclick="viewRFQ(${rfq.id})">
            View
          </button>
        </td>
      </tr>
    `;
  });
}

function mapStatusClass(status) {
  return {
    draft: "draft",
    active: "active",
    quoted: "submitted",
    po_issued: "closed"
  }[status] || "draft";
}

function formatStatus(status) {
  return status.replace("_", " ").toUpperCase();
}

/* =========================================================
   NAVIGATION
========================================================= */
function viewRFQ(id) {
 window.location.href =
  "/axo-networks/frontend/rfq-detail.html?id=" + id;
}

function goToCreateRFQ() {
  window.location.href =
    "/axo-networks/frontend/rfq-create.html";
}

function logout() {
  localStorage.clear();
  window.location.href = "/login";
}

/* =========================================================
   SKELETON
========================================================= */
function hideSkeletons() {
  document.querySelectorAll(".skeleton").forEach(el => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 300);
  });
}

/* =========================================================
   STATUS MESSAGE (TOP CENTER)
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
