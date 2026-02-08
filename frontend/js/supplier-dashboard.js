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
        id: 22, // supplier user id
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
   MOCK DATA (LOCAL MODE)
   mirrors DB relations
========================================================= */

const MOCK_RFQS = [
  {
    id: 201,
    part_name: "Aluminium Housing",
    total_quantity: 5000,
    status: "active"
  },
  {
    id: 202,
    part_name: "Plastic Enclosure",
    total_quantity: 8000,
    status: "quoted"
  },
  {
    id: 203,
    part_name: "Metal Bracket",
    total_quantity: 3000,
    status: "po_issued"
  }
];

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("userEmail").innerText = getUser().email;

  // allow skeleton shimmer
  setTimeout(loadDashboard, IS_LOCAL ? 1000 : 0);
});

/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {
  let rfqs = [];

  if (IS_LOCAL) {
    rfqs = MOCK_RFQS;
  } else {
    rfqs = await fetchSupplierRFQs();
  }

  renderSummary(rfqs);
  renderTable(rfqs);
  hideSkeletons();
}

/* =========================================================
   API – PROD MODE
========================================================= */
/*
  EXPECTED BACKEND ENDPOINTS:

  GET /api/rfqs/available
  GET /api/quotes/supplier/:supplierId
  GET /api/purchase-orders/supplier/:supplierId
*/

async function fetchSupplierRFQs() {
  try {
    const res = await fetch("/api/rfqs/available", {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    return result.data;
  } catch (err) {
    console.error("❌ Supplier RFQ fetch failed:", err.message);
    showMessage("Failed to load RFQs", "error");
    return [];
  }
}

/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(rfqs) {
  const summary = document.getElementById("summarySection");

  const total = rfqs.length;
  const quoted = rfqs.filter(r => r.status === "quoted").length;
  const po = rfqs.filter(r => r.status === "po_issued").length;
  const active = rfqs.filter(r => r.status === "active").length;

  summary.innerHTML = `
    <div class="card">
      <h3>Total RFQs</h3>
      <p>${total}</p>
    </div>

    <div class="card">
      <h3>Quoted RFQs</h3>
      <p>${quoted}</p>
    </div>

    <div class="card">
      <h3>PO Received</h3>
      <p>${po}</p>
    </div>

    <div class="card">
      <h3>Active RFQs</h3>
      <p>${active}</p>
    </div>
  `;
}

/* =========================================================
   RFQ TABLE
========================================================= */

function renderTable(rfqs) {
  const tbody = document.getElementById("rfqTableBody");
  tbody.innerHTML = "";

  if (!rfqs.length) {
    tbody.innerHTML = `<tr><td colspan="5">No RFQs available</td></tr>`;
    return;
  }

  rfqs.forEach(rfq => {
    tbody.innerHTML += `
      <tr>
        <td>${rfq.id}</td>
        <td>${rfq.part_name}</td>
        <td>${rfq.total_quantity}</td>
        <td>
          <span class="status ${mapStatus(rfq.status)}">
            ${formatStatus(rfq.status)}
          </span>
        </td>
        <td>
          <button onclick="openRFQ(${rfq.id})">
            ${rfq.status === "active" ? "View & Quote" : "View"}
          </button>
        </td>
      </tr>
    `;
  });
}

function mapStatus(status) {
  if (status === "active") return "active";
  if (status === "quoted") return "quoted";
  if (status === "po_issued") return "po";
  return "active";
}

function formatStatus(status) {
  return status.replace("_", " ").toUpperCase();
}

/* =========================================================
   ACTIONS
========================================================= */

function openRFQ(id) {
  window.location.href = `/supplier-rfq-detail.html?id=${id}`;
}

function logout() {
  localStorage.clear();
  window.location.reload();
}

/* =========================================================
   SKELETON HANDLING
========================================================= */

function hideSkeletons() {
  document.querySelectorAll(".skeleton, .skeleton-row").forEach(el => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 300);
  });
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
