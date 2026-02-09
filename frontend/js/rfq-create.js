/* =========================================================
   ENV
========================================================= */
const ENV = "local";
const IS_LOCAL = ENV === "local";

/* =========================================================
   AUTH
========================================================= */
function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}
function getToken() {
  return localStorage.getItem("token");
}

/* LOCAL MODE */
if (IS_LOCAL && !getUser()) {
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

/* PROD MODE */
if (!IS_LOCAL && (!getUser() || !getToken())) {
  window.location.href = "/login";
}

/* =========================================================
   DOM READY
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("rfqForm").addEventListener("submit", submitRFQ);
  document.getElementById("saveDraftBtn").addEventListener("click", saveDraft);
});

/* =========================================================
   PAYLOAD BUILDER
========================================================= */
function buildRFQPayload(status) {
  return {
    buyer_id: getUser().id,
    part_name: value("partName"),
    part_id: value("partId"),
    total_quantity: Number(value("totalQuantity")),
    batch_quantity: Number(value("batchQuantity")) || null,
    target_price: Number(value("targetPrice")) || null,
    delivery_timeline: value("deliveryTimeline"),
    material_specification: value("materialSpec"),
    ppap_level: value("ppapLevel") || null,
    status,
    files: document.getElementById("rfqFiles").files
  };
}

const value = id => document.getElementById(id)?.value.trim();

/* =========================================================
   VALIDATION
========================================================= */
function validateRFQ(p) {
  if (!p.part_name) return "Part name is required";
  if (!p.part_id) return "Part ID is required";
  if (!p.total_quantity || p.total_quantity <= 0)
    return "Total quantity must be greater than 0";
  if (!p.delivery_timeline)
    return "Delivery timeline is required";
  return null;
}

/* =========================================================
   ACTIONS
========================================================= */
async function saveDraft() {
  clearMessage();

  const payload = buildRFQPayload("draft");
  payload.delivery_timeline ||= "TBD"; // draft safe

  if (IS_LOCAL) {
    showMessage("Draft saved successfully", "success");
    redirectDashboard();
    return;
  }

  await sendRFQ(payload);
}

async function submitRFQ(e) {
  e.preventDefault();
  clearMessage();

  const payload = buildRFQPayload("active");
  const error = validateRFQ(payload);
  if (error) return showMessage(error, "error");

  if (IS_LOCAL) {
    showMessage("RFQ submitted successfully", "success");
    redirectDashboard();
    return;
  }

  await sendRFQ(payload);
}

/* =========================================================
   API
========================================================= */
async function sendRFQ(payload) {
  try {
    const formData = new FormData();

    Object.entries(payload).forEach(([k, v]) => {
      if (k === "files") {
        [...v].forEach(f => formData.append("files", f));
      } else {
        formData.append(k, v);
      }
    });

    const res = await fetch("/api/rfqs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`
      },
      body: formData
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    showMessage(
      payload.status === "draft"
        ? "Draft saved successfully"
        : "RFQ submitted successfully",
      "success"
    );

    redirectDashboard();

  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to submit RFQ", "error");
  }
}

/* =========================================================
   UI HELPERS
========================================================= */
function redirectDashboard() {
  setTimeout(() => {
    window.location.href =
      "/axo-networks/frontend/buyer-dashboard.html";
  }, 800);
}

function showMessage(text, type) {
  const box = document.getElementById("statusMessage");
  box.textContent = text;
  box.className = `status-message ${type}`;
  box.style.display = "block";
}

function clearMessage() {
  const box = document.getElementById("statusMessage");
  if (box) box.style.display = "none";
}
