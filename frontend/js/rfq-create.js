/* =========================================================
   AXO RFQ CREATE – ENTERPRISE PRODUCTION JS
========================================================= */

/* ================= AUTH HELPERS ================= */

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

  if (!user || !token || user.role?.toLowerCase() !== "buyer") {
    window.location.href = "/frontend/login.html";
  }
})();

/* ================= INIT ================= */

let isSubmitting = false;

document.addEventListener("DOMContentLoaded", () => {

  const user = getUser();
  document.getElementById("userEmail").textContent = user.email;

  const form = document.getElementById("rfqForm");
  const draftBtn = document.getElementById("saveDraftBtn");

  form.addEventListener("submit", (e) => handleSubmit(e, "submitted"));
  draftBtn.addEventListener("click", (e) => handleSubmit(e, "draft"));
});

/* =========================================================
   MAIN SUBMIT HANDLER
========================================================= */

async function handleSubmit(event, status) {

  event.preventDefault();

  if (isSubmitting) return;

  clearErrors();

  const formData = collectFormData(status);

  if (!validateForm(formData)) return;

  try {
    isSubmitting = true;
    setLoadingState(true);

    const response = await fetch("/api/rfqs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getToken()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    if (response.status === 401 || response.status === 403) {
      window.location.href = "/frontend/login.html";
      return;
    }

    if (!response.ok) {
      throw new Error("Server error");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Submission failed");
    }

    window.location.href = "/frontend/buyer-dashboard.html";

  } catch (error) {
    showFormError("Unable to submit RFQ. Please try again.");
  } finally {
    isSubmitting = false;
    setLoadingState(false);
  }
}

/* =========================================================
   DATA COLLECTION
========================================================= */

function collectFormData(status) {

  return {
    part_name: sanitize(document.getElementById("part_name").value),
    part_id: sanitize(document.getElementById("part_id").value),
    total_quantity: Number(document.getElementById("total_quantity").value),
    batch_quantity: Number(document.getElementById("batch_quantity").value),
    target_price: document.getElementById("target_price").value || null,
    delivery_timeline: sanitize(document.getElementById("delivery_timeline").value),
    material_specification: sanitize(document.getElementById("material_specification").value),
    ppap_level: document.getElementById("ppap_level").value,
    status
  };
}

/* =========================================================
   VALIDATION
========================================================= */

function validateForm(data) {

  let valid = true;

  if (!data.part_name) {
    setFieldError("part_name", "Part name is required");
    valid = false;
  }

  if (!data.part_id) {
    setFieldError("part_id", "Part ID is required");
    valid = false;
  }

  if (!data.total_quantity || data.total_quantity <= 0) {
    setFieldError("total_quantity", "Enter valid total quantity");
    valid = false;
  }

  if (!data.batch_quantity || data.batch_quantity <= 0) {
    setFieldError("batch_quantity", "Enter valid batch quantity");
    valid = false;
  }

  if (!data.delivery_timeline) {
    setFieldError("delivery_timeline", "Delivery timeline required");
    valid = false;
  }

  if (!data.material_specification) {
    setFieldError("material_specification", "Material specification required");
    valid = false;
  }

  if (!data.ppap_level) {
    setFieldError("ppap_level", "Select PPAP level");
    valid = false;
  }

  return valid;
}

/* =========================================================
   UI HELPERS
========================================================= */

function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorSpan = field.parentElement.querySelector(".error-text");

  if (errorSpan) {
    errorSpan.textContent = message;
  }

  field.style.borderColor = "#dc2626";
}

function clearErrors() {
  document.querySelectorAll(".error-text").forEach(el => el.textContent = "");
  document.querySelectorAll("input, textarea, select")
    .forEach(el => el.style.borderColor = "");
}

function showFormError(message) {
  const banner = document.createElement("div");
  banner.className = "form-global-error";
  banner.textContent = message;

  const form = document.getElementById("rfqForm");
  form.prepend(banner);

  setTimeout(() => banner.remove(), 4000);
}

function setLoadingState(loading) {
  const submitBtn = document.querySelector(".primary-btn");

  if (loading) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit RFQ";
  }
}

/* =========================================================
   SECURITY SANITIZATION
========================================================= */

function sanitize(value) {
  return String(value).replace(/[<>&"']/g, "").trim();
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
