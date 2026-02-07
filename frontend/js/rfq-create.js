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
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("rfqForm");
  if (form) {
    form.addEventListener("submit", submitRFQ);
  }
});

/* =========================================================
   FORM DATA BUILDER
========================================================= */

function buildRFQPayload(status) {
  const user = getUser();

  return {
    buyer_id: user.id,
    part_name: getValue("partName"),
    part_id: getValue("partId"),
    total_quantity: Number(getValue("totalQuantity")),
    batch_quantity: Number(getValue("batchQuantity")) || null,
    target_price: Number(getValue("targetPrice")) || null,
    delivery_timeline: getValue("deliveryTimeline"),
    material_specification: getValue("materialSpec"),
    ppap_level: getValue("ppapLevel") || null,
    status, // draft | active
    files: document.getElementById("rfqFiles")?.files || []
  };
}

function getValue(id) {
  return document.getElementById(id)?.value.trim();
}

/* =========================================================
   VALIDATION
========================================================= */

function validateRFQ(payload) {
  if (!payload.part_name) return "Part name is required";
  if (!payload.part_id) return "Part ID is required";
  if (!payload.total_quantity || payload.total_quantity <= 0)
    return "Total quantity must be greater than 0";
  if (!payload.delivery_timeline)
    return "Delivery timeline is required";

  return null;
}

/* =========================================================
   ACTIONS
========================================================= */

function saveDraft() {
  clearMessage();

  const payload = buildRFQPayload("draft");

  // Draft allows partial save → skip delivery validation
  if (IS_LOCAL) {
    console.log("📝 Draft RFQ (LOCAL):", payload);
    showMessage("Draft saved successfully (Local Mode)", "success");

    setTimeout(() => {
      window.location.href = "./buyer-dashboard.html";
    }, 800);
  } else {
    sendRFQToAPI(payload, true);
  }
}

async function submitRFQ(e) {
  e.preventDefault();
  clearMessage();

  const payload = buildRFQPayload("active");
  const error = validateRFQ(payload);

  if (error) {
    showMessage(error, "error");
    return;
  }

  if (IS_LOCAL) {
    console.log("🚀 Submit RFQ (LOCAL):", payload);
    showMessage("RFQ submitted successfully (Local Mode)", "success");

    setTimeout(() => {
      window.location.href = "./buyer-dashboard.html";
    }, 800);
  } else {
    sendRFQToAPI(payload, false);
  }
}

/* =========================================================
   API – PROD MODE
========================================================= */
/*
Expected backend:
POST /api/rfqs
Authorization: Bearer <token>
Content-Type: multipart/form-data
*/

async function sendRFQToAPI(payload, isDraft) {
  try {
    clearMessage();

    const formData = new FormData();

    Object.keys(payload).forEach(key => {
      if (key === "files") {
        [...payload.files].forEach(file => {
          formData.append("files", file);
        });
      } else {
        if (payload[key] !== null && payload[key] !== undefined) {
          formData.append(key, payload[key]);
        }
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
      isDraft ? "Draft saved successfully" : "RFQ submitted successfully",
      "success"
    );

    setTimeout(() => {
     window.location.href =
  "/axo-networks/frontend/buyer-dashboard.html";
    }, 1000);

  } catch (err) {
    console.error("❌ RFQ submit failed:", err);
    showMessage(
      err.message || "Failed to submit RFQ. Please try again.",
      "error"
    );
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

function goBack() {
  window.history.back();
}

/* =========================================================
   STATUS MESSAGE HANDLER
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
