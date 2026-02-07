// ============================================
// LOGIN SYSTEM (STABLE, LOOP-SAFE, ROLE-SAFE)
// ============================================

const API_BASE_URL = "/api";
let currentUser = null;

/* ===================== PAGE LOAD ===================== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Login page loaded");
  clearAuthData(); // 🔒 prevents redirect loops
});

/* ===================== REDIRECT ===================== */
function redirectToDashboard(user) {
  if (!user || !user.role) return;

  const role = user.role.toUpperCase(); // ✅ normalize

  if (role === "ADMIN") {
    window.location.href = "/admin-dashboard";
  } else {
    // BUYER / SUPPLIER / BOTH
    window.location.href = "/buyer-dashboard";
  }
}

/* ===================== UI HELPERS ===================== */
function showMessage(message, type = "error") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = type;
  status.style.display = "block";
}

function clearMessage() {
  const status = document.getElementById("status");
  status.style.display = "none";
  status.textContent = "";
}

function setLoading(isLoading) {
  const btn = document.getElementById("loginBtn");
  const btnText = document.getElementById("loginBtnText");

  btn.disabled = isLoading;
  btnText.innerHTML = isLoading
    ? '<span class="spinner"></span> Signing in...'
    : "Sign In";
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ===================== AUTH STORAGE ===================== */
function storeAuthData(token, userData) {
  const user = {
    id: userData.id,
    email: userData.email,
    role: userData.role
  };

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  console.log("✅ Auth stored for:", user.email, user.role);
  return user;
}

function clearAuthData() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/* ===================== LOGIN SUBMIT ===================== */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!validateEmail(email)) {
    showMessage("Please enter a valid email address");
    return;
  }

  if (!password) {
    showMessage("Please enter your password");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    console.log("📥 Login response:", result);

    if (!result.success || !result.token || !result.user) {
      showMessage(result.message || "Invalid credentials");
      setLoading(false);
      return;
    }

    const user = storeAuthData(result.token, result.user);

    showMessage("Login successful! Redirecting...", "success");

    setTimeout(() => {
      redirectToDashboard(user);
    }, 500);

  } catch (err) {
    console.error("❌ Login error:", err);
    showMessage("Server error. Please try again.");
    setLoading(false);
  }
});

/* ===================== HEALTH CHECK ===================== */
setTimeout(async () => {
  try {
    const res = await fetch("/api/_health");
    if (!res.ok) throw new Error();
    console.log("✅ API reachable");
  } catch {
    console.warn("⚠️ API not reachable");
  }
}, 800);

