/* =========================
   CONFIG
   ========================= */
const API = (path) => `http://localhost:4000${path}`;

/* =========================
   VANTA BACKGROUND
   ========================= */
// let vantaEffect = null;
// function startVanta() {
//   if (window.VANTA && !vantaEffect) {
//     vantaEffect = VANTA.CLOUDS({
//       el: "#vanta-bg",
//       mouseControls: true,
//       touchControls: true,
//       minHeight: 200.00,
//       minWidth: 200.00,
//       skyColor: 0x071428,
//       cloudColor: 0x213247,
//       backgroundAlpha: 0
//     });
//   }
// }

/* =========================
   DOM & State
   ========================= */
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authMsg = document.getElementById('auth-msg');
const userNameEl = document.getElementById('user-name');

const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

const productsTableBody = document.querySelector('#products-table tbody');
const btnNew = document.getElementById('btn-new');
const modal = document.getElementById('modal');
const productForm = document.getElementById('product-form');
const modalCancel = document.getElementById('modal-cancel');
const searchInput = document.getElementById('search');

const ordersList = document.getElementById('orders-list');
const totalProductsEl = document.getElementById('total-products');
const totalOrdersEl = document.getElementById('total-orders');
const lowStockCountEl = document.getElementById('low-stock-count');
const totalValueEl = document.getElementById('total-value');

const exportCsvBtn = document.getElementById('export-csv');

let products = [];
let orders = [];
let currentEditId = null;

/* =========================
   AUTH
   ========================= */
authForm.onsubmit = async (e) => {
  e.preventDefault();
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  try {
    const res = await fetch(API('/api/login'), {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      authMsg.textContent = data.error || 'Login failed';
      return;
    }
    authOverlay.style.display = 'none';
    userNameEl.textContent = data.user.username;
    initApp();
  } catch (err) {
    authMsg.textContent = 'Server error';
  }
};

document.getElementById('auth-guest').onclick = () => {
  authOverlay.style.display = 'none';
  userNameEl.textContent = 'Guest';
  initApp();
};

/* =========================
   NAV
   ========================= */
navBtns.forEach(btn => btn.addEventListener('click', () => {
  navBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const view = btn.dataset.view;
  views.forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
}));

/* =========================
   PRODUCTS & ORDERS (core logic)
   ========================= */
async function loadProducts(q) {
  const url = new URL(API('/api/products'));
  if (q) url.searchParams.set('search', q);
  const res = await fetch(url);
  products = await res.json();
  renderProducts();
  calculateDashboard();
}

function renderProducts() {
  productsTableBody.innerHTML = '';
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.category||''}</td>
      <td>₹${Number(p.price).toFixed(2)}</td>
      <td>${p.quantity}</td>
      <td>
        <button class="edit" data-id="${p.id}">Edit</button>
        <button class="delete" data-id="${p.id}">Delete</button>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });
}

document.querySelector('#products-table tbody').onclick = async (e) => {
  if (e.target.matches('.edit')) {
    const id = e.target.dataset.id;
    const p = products.find(x => x.id == id);
    if (!p) return;
    currentEditId = id;
    document.getElementById('modal-title').textContent = 'Edit Product';
    productForm.name.value = p.name;
    productForm.category.value = p.category || '';
    productForm.price.value = p.price;
    productForm.quantity.value = p.quantity;
    modal.classList.remove('hidden');
  } else if (e.target.matches('.delete')) {
    const id = e.target.dataset.id;
    if (!confirm('Delete product?')) return;
    await fetch(API(`/api/products/${id}`), { method: 'DELETE' });
    await loadProducts(searchInput.value);
  }
};

btnNew.onclick = () => {
  currentEditId = null;
  document.getElementById('modal-title').textContent = 'New Product';
  productForm.name.value = '';
  productForm.category.value = '';
  productForm.price.value = '0.00';
  productForm.quantity.value = '0';
  modal.classList.remove('hidden');
};

modalCancel.onclick = () => modal.classList.add('hidden');

productForm.onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    name: productForm.name.value,
    category: productForm.category.value,
    price: Number(productForm.price.value),
    quantity: Number(productForm.quantity.value)
  };
  if (currentEditId) {
    await fetch(API(`/api/products/${currentEditId}`), {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(API('/api/products'), {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
  }
  modal.classList.add('hidden');
  await loadProducts(searchInput.value);
};

/* =========================
   ORDERS
   ========================= */
async function loadOrders() {
  const res = await fetch(API('/api/orders'));
  orders = await res.json();
  renderOrders();
  calculateDashboard();
}

function renderOrders() {
  ordersList.innerHTML = '';
  orders.forEach(o => {
    const div = document.createElement('div');
    div.className = 'order';
    div.innerHTML = `<div><strong>Order #${o.id}</strong> • ${new Date(o.order_date).toLocaleString()} • Total: ₹${Number(o.total).toFixed(2)}</div>
      <ul>${o.items.map(it => `<li>${it.name || 'Unknown'} x ${it.quantity} — ₹${Number(it.price).toFixed(2)}</li>`).join('')}</ul>`;
    ordersList.appendChild(div);
  });
}

/* =========================
   DASHBOARD STATS & CHARTS
   ========================= */
function calculateDashboard() {
  totalProductsEl.textContent = products.length;
  totalOrdersEl.textContent = orders.length;
  const low = products.filter(p => p.quantity < 10).length;
  lowStockCountEl.textContent = low;
  const totalVal = products.reduce((s,p) => s + (Number(p.price) * Number(p.quantity || 0)), 0);
  totalValueEl.textContent = `₹${totalVal.toFixed(2)}`;

  renderCharts();
}

let salesChart = null;
let stockChart = null;
function renderCharts() {
  // Sales: last 7 orders totals
  const salesLabels = orders.slice(0,7).map(o => `#${o.id}`);
  const salesData = orders.slice(0,7).map(o => Number(o.total));
  const ctx = document.getElementById('sales-chart').getContext('2d');
  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: salesLabels.reverse(), datasets: [{ label: 'Order Total', data: salesData.reverse(), borderRadius:6 }] },
    options: { responsive:true, plugins:{ legend:{ display:false } } }
  });

  // Stock distribution: top 6 products by quantity
  const top = [...products].sort((a,b)=>b.quantity-a.quantity).slice(0,6);
  const stockLabels = top.map(p => p.name);
  const stockData = top.map(p => Number(p.quantity));
  const ctx2 = document.getElementById('stock-chart').getContext('2d');
  if (stockChart) stockChart.destroy();
  stockChart = new Chart(ctx2, {
    type: 'pie',
    data: { labels: stockLabels, datasets: [{ data: stockData }] },
    options: { responsive:true }
  });
}

/* =========================
   CSV EXPORT
   ========================= */
exportCsvBtn && (exportCsvBtn.onclick = () => {
  const rows = [['id','name','category','price','quantity']];
  products.forEach(p => rows.push([p.id,p.name,p.category||'',p.price,p.quantity]));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'products.csv'; a.click();
  URL.revokeObjectURL(url);
});

/* =========================
   BOOTSTRAP & EVENTS
   ========================= */
document.getElementById('btn-refresh').onclick = () => { loadProducts(searchInput.value); loadOrders(); };
searchInput.oninput = () => loadProducts(searchInput.value);

async function initApp(){
  startVanta();
  await loadProducts();
  await loadOrders();
  // start on dashboard
  document.querySelector('.nav-btn[data-view="dashboard"]').click();
}

// Start with auth overlay; if your server doesn't require auth, click 'Continue as Guest'.
// If you prefer auto-skip auth while developing, call initApp() directly here.



/* =========================
   ORDER CREATION
   ========================= */
const btnNewOrder = document.getElementById('btn-new-order');
const orderModal = document.getElementById('order-modal');
const orderForm = document.getElementById('order-form');
const orderCancel = document.getElementById('order-cancel');
const orderProductSelect = document.getElementById('order-product');
const orderQtyInput = document.getElementById('order-qty');

btnNewOrder.onclick = () => {
  // Populate product dropdown
  orderProductSelect.innerHTML = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  orderQtyInput.value = 1;
  orderModal.classList.remove('hidden');
};

orderCancel.onclick = () => orderModal.classList.add('hidden');

orderForm.onsubmit = async (e) => {
  e.preventDefault();
  const productId = Number(orderProductSelect.value);
  const qty = Number(orderQtyInput.value);
  const product = products.find(p => p.id === productId);
  if (!product) return alert('Invalid product');
  const payload = {
    items: [{ product_id: product.id, quantity: qty, price: product.price }],
    total: product.price * qty
  };
  await fetch(API('/api/orders'), {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  orderModal.classList.add('hidden');
  await loadOrders();
  await loadProducts();
};

/* =========================
   DASHBOARD CARD LINKS
   ========================= */
document.getElementById('total-products').parentElement.onclick = () => {
  document.querySelector('.nav-btn[data-view="products"]').click();
};
document.getElementById('total-orders').parentElement.onclick = () => {
  document.querySelector('.nav-btn[data-view="orders"]').click();
};

/* =========================
   REFRESH / SEARCH / INIT
   ========================= */
document.getElementById('btn-refresh').onclick = () => { loadProducts(searchInput.value); loadOrders(); };
searchInput.oninput = () => loadProducts(searchInput.value);

async function initApp(){
  await loadProducts();
  await loadOrders();
  document.querySelector('.nav-btn[data-view="dashboard"]').click();
}
