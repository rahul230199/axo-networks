/* =========================================================
   AXO BUYER DASHBOARD – ENTERPRISE PRODUCTION JS
========================================================= */

/* ================= AUTH HELPERS ================= */

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem("token");
}

/* ================= AUTH GUARD ================= */

(function authGuard() {
  const user = getUser();
  const token = getToken();

  if (!user || !token || user.role?.toLowerCase() !== "buyer") {
    logout();
  }
})();

/* ================= GLOBAL STATE ================= */

let rfqData = [];
let pieChart = null;
let barChart = null;

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  document.getElementById("userEmail").textContent = user.email;

  showSkeletons();
  await loadDashboard();
});

/* =========================================================
   DASHBOARD LOAD – REAL DB DATA ONLY
========================================================= */

async function loadDashboard() {
  try {
    const user = getUser();

    const [rfqs, pos] = await Promise.all([
      fetchAPI("/api/rfqs"),
      fetchAPI(`/api/purchase-orders/buyer/${user.id}`)
    ]);

    rfqData = rfqs || [];

    hideSkeletons();
    updateStats(rfqData, pos || []);
    renderTable(rfqData);
    renderCharts(rfqData);
    initWebSocket();

  } catch (error) {
    hideSkeletons();
    showError("Unable to load dashboard data. Please try again.");
  }
}

/* =========================================================
   API WRAPPER – SECURE
========================================================= */

async function fetchAPI(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    logout();
    return [];
  }

  if (!response.ok) {
    throw new Error("Network error");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "API error");
  }

  return data.data || [];
}

/* =========================================================
   ANIMATED COUNTERS
========================================================= */

function updateStats(rfqs, pos) {
  animateValue("totalRfqs", rfqs.length);
  animateValue(
    "activeRfqs",
    rfqs.filter(r => r.status === "open").length
  );
  animateValue("totalPos", pos.length);
}

function animateValue(id, end) {
  const el = document.getElementById(id);
  const duration = 800;

  let start = 0;
  const increment = end > 0 ? Math.ceil(end / 30) : 1;

  const timer = setInterval(() => {
    start += increment;

    if (start >= end) {
      el.textContent = end;
      clearInterval(timer);
    } else {
      el.textContent = start;
    }
  }, duration / 30);
}

/* =========================================================
   TABLE RENDER
========================================================= */

function renderTable(data) {
  const tbody = document.getElementById("rfqTableBody");
  tbody.innerHTML = "";

  if (!data.length) {
    tbody.innerHTML =
      `<tr><td colspan="6" class="loading">No RFQs found</td></tr>`;
    return;
  }

  data.forEach(rfq => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHTML(rfq.id)}</td>
      <td>${escapeHTML(rfq.part_name)}</td>
      <td>${escapeHTML(rfq.total_quantity)}</td>
      <td>
        <span class="status ${escapeHTML(rfq.status)}">
          ${escapeHTML(rfq.status).toUpperCase()}
        </span>
      </td>
      <td>${formatDate(rfq.created_at)}</td>
      <td>
        <button class="primary-btn" onclick="viewRFQ(${rfq.id})">
          View
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

/* =========================================================
   CHARTS
========================================================= */

function renderCharts(rfqs) {
  renderPie(rfqs);
  renderBar(rfqs);
}

function renderPie(rfqs) {
  const counts = {};

  rfqs.forEach(r => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(document.getElementById("rfqPieChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: [
          "#2563eb",
          "#10b981",
          "#f59e0b"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function renderBar(rfqs) {
  const monthly = {};

  rfqs.forEach(r => {
    const key = new Date(r.created_at)
      .toLocaleString("default", { month: "short" });

    monthly[key] = (monthly[key] || 0) + 1;
  });

  if (barChart) barChart.destroy();

  barChart = new Chart(document.getElementById("rfqBarChart"), {
    type: "bar",
    data: {
      labels: Object.keys(monthly),
      datasets: [{
        data: Object.values(monthly),
        backgroundColor: "#2563eb"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

/* =========================================================
   SKELETON LOADING
========================================================= */

function showSkeletons() {
  document
    .querySelectorAll(".chart-skeleton, .table-skeleton")
    .forEach(el => el.classList.remove("hidden"));
}

function hideSkeletons() {
  document
    .querySelectorAll(".chart-skeleton, .table-skeleton")
    .forEach(el => el.classList.add("hidden"));
}

/* =========================================================
   HELPERS
========================================================= */

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

function escapeHTML(str) {
  return String(str).replace(/[<>&"']/g, "");
}

/* =========================================================
   NAVIGATION
========================================================= */

function viewRFQ(id) {
  window.location.href = `/rfq-detail?id=${id}`;
}

function goToCreateRFQ() {
  window.location.href = `/rfq-create`;
}

function goToPO() {
  window.location.href = `/buyer-po`;
}

function logout() {
  localStorage.clear();
  window.location.href = "/login.html";
}

/* =========================================================
   ERROR HANDLING
========================================================= */

function showError(message) {
  const banner = document.getElementById("errorBanner");
  if (!banner) return;

  banner.textContent = message;
  banner.classList.remove("hidden");
}
let socket;

function initWebSocket() {
  socket = new WebSocket("ws://localhost:3000");

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.event === "rfq_updated") {
      handleLiveRFQUpdate(data.payload);
    }
  };

  socket.onclose = () => {
    setTimeout(initWebSocket, 5000);
  };
}

function handleLiveRFQUpdate(update) {
  const rfq = rfqData.find(r => r.id === update.rfqId);
  if (rfq) {
    rfq.status = update.status;
    renderTable(rfqData);
    renderCharts(rfqData);
    showToast(`RFQ ${update.rfqId} updated to ${update.status}`);
  }
}
