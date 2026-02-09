const ENV = "local";
const IS_LOCAL = ENV === "local";

/* AUTH */
function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}
function getToken() {
  return localStorage.getItem("token");
}

/* PO ID */
const params = new URLSearchParams(window.location.search);
const PO_ID = params.get("id");

/* MOCK DATA */
const MOCK_PO = {
  id: PO_ID,
  rfq_id: 101,
  supplier_id: 22,
  quantity: 5000,
  price: 120,
  status: "issued",
  created_at: "2026-02-06"
};

/* INIT */
document.addEventListener("DOMContentLoaded", loadPODetail);

async function loadPODetail() {
  try {
    let po;

    if (IS_LOCAL) {
      po = MOCK_PO;
    } else {
      po = await fetchPO();
    }

    renderPO(po);
    hideSkeletons();
  } catch (err) {
    showMessage("Failed to load PO details", "error");
  }
}

/* API */
async function fetchPO() {
  const res = await fetch(`/api/purchase-orders/${PO_ID}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  const result = await res.json();
  if (!result.success) throw new Error(result.message);
  return result.data;
}

/* RENDER */
function renderPO(po) {
  setText("poId", po.id);
  setText("rfqId", po.rfq_id);
  setText("supplier", po.supplier_id);
  setText("quantity", po.quantity);
  setText("price", `₹${po.price}`);
  setText("createdAt", po.created_at);

  const status = document.getElementById("poStatus");
  status.textContent = po.status.toUpperCase();
  status.classList.remove("skeleton");
}

/* HELPERS */
function setText(id, value) {
  const el = document.getElementById(id);
  el.textContent = value;
  el.classList.remove("skeleton");
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

function showMessage(text, type) {
  const box = document.getElementById("statusMessage");
  box.textContent = text;
  box.className = `status-message ${type}`;
  box.style.display = "block";
}
