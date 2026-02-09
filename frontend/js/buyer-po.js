const ENV = "local";
const IS_LOCAL = ENV === "local";

/* AUTH */
function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}
function getToken() {
  return localStorage.getItem("token");
}

/* MOCK DATA */
const MOCK_POS = [
  {
    id: 9001,
    rfq_id: 101,
    supplier_id: 22,
    quantity: 5000,
    price: 120,
    status: "issued"
  }
];

/* INIT */
document.addEventListener("DOMContentLoaded", loadPOs);

async function loadPOs() {
  try {
    let pos = [];

    if (IS_LOCAL) {
      pos = MOCK_POS;
    } else {
      pos = await fetchPOs();
    }

    renderPOs(pos);
  } catch (err) {
    showMessage("Failed to load purchase orders", "error");
  }
}

/* API */
async function fetchPOs() {
  const buyerId = getUser().id;

  const res = await fetch(`/api/purchase-orders/buyer/${buyerId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  const result = await res.json();
  if (!result.success) throw new Error(result.message);
  return result.data;
}

/* RENDER */
function renderPOs(pos) {
  const tbody = document.getElementById("poTableBody");
  tbody.innerHTML = "";

  if (!pos.length) {
    tbody.innerHTML = `<tr><td colspan="7">No purchase orders</td></tr>`;
    return;
  }

  pos.forEach(po => {
    tbody.innerHTML += `
      <tr>
        <td>${po.id}</td>
        <td>${po.rfq_id}</td>
        <td>${po.supplier_id}</td>
        <td>${po.quantity}</td>
        <td>₹${po.price}</td>
        <td><span class="status issued">ISSUED</span></td>
        <td>
          <button onclick="viewPO(${po.id})">View</button>
        </td>
      </tr>
    `;
  });
}

/* NAV */
function viewPO(id) {
  window.location.href = `/po-detail.html?id=${id}`;
}

function goBack() {
  window.history.back();
}

/* STATUS */
function showMessage(text, type) {
  const box = document.getElementById("statusMessage");
  box.textContent = text;
  box.className = `status-message ${type}`;
  box.style.display = "block";
}
