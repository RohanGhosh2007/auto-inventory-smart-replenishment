const API_URL = "";

let forecastChart = null;
let productsCache = [];
let ordersCache = [];
let replenishmentCache = [];

const PAGE_META = {
    "view-overview": ["Overview", "Live snapshot of stock, demand and open orders."],
    "view-manage": ["Add & record", "Register new products and log sales as they happen."],
    "view-inventory": ["Inventory", "Every product currently tracked, with live stock status."],
    "view-forecast": ["Demand forecast", "Recent sales against a simple 7-day moving average."],
    "view-replenishment": ["Replenishment", "Reorder points computed from lead time, safety stock and forecast demand."],
    "view-orders": ["Purchase orders", "Orders placed for replenishment, and their delivery status."]
};

// ============================================================
// Utilities: fetch, toasts, formatting
// ============================================================

async function apiFetch(path, options) {
    const response = await fetch(`${API_URL}${path}`, options);
    let data = null;

    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }

    if (!response.ok) {
        const detail = (data && data.detail) ? data.detail : `Request failed (${response.status})`;
        throw new Error(detail);
    }

    setConnectionState(true);
    return data;
}

function showToast(message, type = "ok") {
    const stack = document.getElementById("toast-stack");
    const toast = document.createElement("div");
    toast.className = `toast${type === "err" ? " err" : type === "warn" ? " warn" : ""}`;
    toast.textContent = message;
    stack.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(6px)";
        toast.style.transition = "opacity 0.2s ease, transform 0.2s ease";
        setTimeout(() => toast.remove(), 200);
    }, 3600);
}

function money(value) {
    return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setButtonBusy(button, busy, busyLabel) {
    if (!button) return;
    const label = button.querySelector(".btn-label");

    if (busy) {
        button.dataset.originalLabel = label ? label.textContent : "";
        if (label) label.innerHTML = `<span class="spinner"></span> ${busyLabel || "Working…"}`;
        button.disabled = true;
    } else {
        if (label) label.textContent = button.dataset.originalLabel || label.textContent;
        button.disabled = false;
    }
}

function getStockStatus(product) {
    if (product.current_stock === 0) return "out";
    if (product.current_stock <= product.safety_stock) return "low";
    return "normal";
}

function statusPill(status) {
    if (status === "out") return `<span class="pill pill-out">Out of stock</span>`;
    if (status === "low") return `<span class="pill pill-low">Low stock</span>`;
    return `<span class="pill pill-ok">Normal</span>`;
}

// ============================================================
// Connection status
// ============================================================

function setConnectionState(online) {
    const dot = document.getElementById("conn-dot");
    const label = document.getElementById("conn-label");
    const banner = document.getElementById("conn-banner");

    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);
    label.textContent = online ? "Backend connected" : "Backend unreachable";
    banner.classList.toggle("is-visible", !online);
}

async function checkConnection() {
    try {
        await fetch(`${API_URL}/health`).then(r => {
            if (!r.ok) throw new Error("offline");
        });
        setConnectionState(true);
    } catch (e) {
        setConnectionState(false);
    }
}

// ============================================================
// Navigation
// ============================================================

function initNavigation() {
    const links = document.querySelectorAll(".rail-link");

    links.forEach(link => {
        link.addEventListener("click", () => {
            const target = link.dataset.target;

            document.querySelectorAll(".view").forEach(v => v.classList.remove("is-active"));
            document.getElementById(target).classList.add("is-active");

            links.forEach(l => l.classList.remove("is-active"));
            link.classList.add("is-active");

            const meta = PAGE_META[target];
            if (meta) {
                document.getElementById("page-title").textContent = meta[0];
                document.getElementById("page-subtitle").textContent = meta[1];
            }
        });
    });
}

function updateClock() {
    const now = new Date();
    document.getElementById("topbar-clock").textContent =
        now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
        "  " +
        now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ============================================================
// Overview: KPIs + snapshot table
// ============================================================

function setKpi(id, value, sub) {
    const el = document.getElementById(id);
    const skel = el.querySelector(".kpi-skel");
    if (skel) skel.remove();

    const valueEl = document.createElement("p");
    valueEl.className = "kpi-value";
    valueEl.textContent = value;
    el.insertBefore(valueEl, el.querySelector(".kpi-sub") || null);

    if (sub) {
        const subEl = document.createElement("p");
        subEl.className = "kpi-sub";
        subEl.textContent = sub;
        el.appendChild(subEl);
    }
}

async function loadOverview() {
    try {
        const [summary, orders] = await Promise.all([
            apiFetch("/inventory/summary"),
            apiFetch("/purchase-orders")
        ]);

        const products = await apiFetch("/products");
        productsCache = products;
        ordersCache = orders;

        const inventoryValue = products.reduce(
            (sum, p) => sum + (p.current_stock * p.unit_price), 0
        );

        const pendingOrders = orders.filter(o => o.status === "Pending").length;

        // Reorder-needed count comes from the replenishment recommendations
        const replenishments = await Promise.all(
            products.map(p => apiFetch(`/replenishment/${p.id}`).catch(() => null))
        );
        replenishmentCache = replenishments.filter(Boolean);
        const reorderNeeded = replenishmentCache.filter(r => r.reorder_required).length;

        setKpi("kpi-value", money(inventoryValue));
        setKpi("kpi-total", summary.total_products);
        setKpi("kpi-low", summary.low_stock_items);
        setKpi("kpi-out", summary.out_of_stock_items);
        setKpi("kpi-reorder", reorderNeeded);
        setKpi("kpi-pending", pendingOrders);

        renderOverviewTable(products);

    } catch (error) {
        console.error("Failed to load overview:", error);
        setConnectionState(false);
    }
}

function renderOverviewTable(products) {
    const table = document.getElementById("overview-table");

    if (products.length === 0) {
        table.innerHTML = `<tr class="row-empty"><td colspan="4">No products yet. Add one from "Add &amp; record" to get started.</td></tr>`;
        return;
    }

    const severity = { out: 0, low: 1, normal: 2 };

    const sorted = [...products].sort((a, b) => {
        const sa = getStockStatus(a);
        const sb = getStockStatus(b);
        if (severity[sa] !== severity[sb]) return severity[sa] - severity[sb];
        return a.current_stock - b.current_stock;
    }).slice(0, 5);

    table.innerHTML = sorted.map(p => {
        const status = getStockStatus(p);
        return `
            <tr>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td class="num">${p.current_stock}</td>
                <td>${statusPill(status)}</td>
            </tr>
        `;
    }).join("");
}

// ============================================================
// Inventory table (search + filter)
// ============================================================

async function loadInventory() {
    try {
        const products = await apiFetch("/products");
        productsCache = products;
        renderInventoryTable();
    } catch (error) {
        console.error("Failed to load inventory:", error);
        document.getElementById("inventory-table").innerHTML =
            `<tr class="row-empty"><td colspan="7">Could not load inventory.</td></tr>`;
    }
}

function renderInventoryTable() {
    const table = document.getElementById("inventory-table");
    const search = document.getElementById("inventory-search").value.trim().toLowerCase();
    const filter = document.getElementById("inventory-filter").value;

    let rows = productsCache.filter(p => {
        const matchesSearch = !search ||
            p.name.toLowerCase().includes(search) ||
            p.category.toLowerCase().includes(search);
        const status = getStockStatus(p);
        const matchesFilter = filter === "all" || status === filter;
        return matchesSearch && matchesFilter;
    });

    if (productsCache.length === 0) {
        table.innerHTML = `<tr class="row-empty"><td colspan="7">No products yet. Add one from "Add &amp; record" to get started.</td></tr>`;
        return;
    }

    if (rows.length === 0) {
        table.innerHTML = `<tr class="row-empty"><td colspan="7">No products match your search.</td></tr>`;
        return;
    }

    table.innerHTML = rows.map(p => {
        const status = getStockStatus(p);
        return `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td class="num">${p.current_stock}</td>
                <td class="num">${p.safety_stock}</td>
                <td class="num">${money(p.unit_price)}</td>
                <td>${statusPill(status)}</td>
            </tr>
        `;
    }).join("");
}

// ============================================================
// Replenishment table (full list)
// ============================================================

async function loadReplenishmentTable() {
    const table = document.getElementById("replenishment-table");

    try {
        const products = productsCache.length ? productsCache : await apiFetch("/products");

        if (products.length === 0) {
            table.innerHTML = `<tr class="row-empty"><td colspan="6">No products yet.</td></tr>`;
            return;
        }

        const rows = await Promise.all(products.map(async p => {
            try {
                return await apiFetch(`/replenishment/${p.id}`);
            } catch (e) {
                return null;
            }
        }));

        table.innerHTML = rows.filter(Boolean).map(data => `
            <tr>
                <td>${data.product_name}</td>
                <td class="num">${data.current_stock}</td>
                <td class="num">${data.average_daily_demand}</td>
                <td class="num">${data.reorder_point}</td>
                <td>${data.reorder_required ? '<span class="pill pill-low">Yes</span>' : '<span class="pill pill-ok">No</span>'}</td>
                <td class="num">${data.suggested_order_quantity}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Failed to load replenishment table:", error);
        table.innerHTML = `<tr class="row-empty"><td colspan="6">Could not load recommendations.</td></tr>`;
    }
}

// ============================================================
// Add product
// ============================================================

async function addProduct(event) {
    event.preventDefault();
    const button = event.target.querySelector("button[type=submit]");
    const message = document.getElementById("product-message");

    const product = {
        name: document.getElementById("product-name").value.trim(),
        category: document.getElementById("product-category").value.trim(),
        current_stock: Number(document.getElementById("product-stock").value),
        unit_price: Number(document.getElementById("product-price").value),
        lead_time: Number(document.getElementById("product-lead-time").value),
        safety_stock: Number(document.getElementById("product-safety-stock").value)
    };

    setButtonBusy(button, true, "Adding…");
    message.textContent = "";
    message.className = "form-msg";

    try {
        await apiFetch("/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product)
        });

        message.textContent = "Product added successfully.";
        message.classList.add("ok");
        document.getElementById("product-form").reset();
        showToast(`Added "${product.name}" to inventory.`);

        await refreshAllData();

    } catch (error) {
        message.textContent = error.message;
        message.classList.add("err");
        showToast(error.message, "err");
    } finally {
        setButtonBusy(button, false);
    }
}

// ============================================================
// Sale product dropdown + record sale
// ============================================================

function populateSelect(select, products, placeholder, formatLabel) {
    const current = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>`;

    products.forEach(product => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = formatLabel(product);
        select.appendChild(option);
    });

    if (current && products.some(p => String(p.id) === current)) {
        select.value = current;
    }
}

async function loadSaleProducts() {
    const products = productsCache.length ? productsCache : await apiFetch("/products");
    populateSelect(
        document.getElementById("sale-product"),
        products,
        "Select product",
        p => `${p.name} (Stock: ${p.current_stock})`
    );
}

async function recordSale(event) {
    event.preventDefault();
    const button = event.target.querySelector("button[type=submit]");
    const message = document.getElementById("sale-message");

    const sale = {
        product_id: Number(document.getElementById("sale-product").value),
        quantity: Number(document.getElementById("sale-quantity").value),
        sale_date: document.getElementById("sale-date").value
    };

    setButtonBusy(button, true, "Recording…");
    message.textContent = "";
    message.className = "form-msg";

    try {
        await apiFetch("/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sale)
        });

        message.textContent = "Sale recorded successfully.";
        message.classList.add("ok");
        document.getElementById("sale-form").reset();
        showToast("Sale recorded.");

        await refreshAllData();

    } catch (error) {
        message.textContent = error.message;
        message.classList.add("err");
        showToast(error.message, "err");
    } finally {
        setButtonBusy(button, false);
    }
}

// ============================================================
// Forecast dropdown + chart
// ============================================================

async function loadForecastProducts() {
    const products = productsCache.length ? productsCache : await apiFetch("/products");
    populateSelect(
        document.getElementById("forecast-product"),
        products,
        "Select product",
        p => p.name
    );
}

async function loadForecast(productId) {
    const empty = document.getElementById("forecast-empty");
    const body = document.getElementById("forecast-body");

    if (!productId) {
        empty.style.display = "block";
        body.style.display = "none";
        return;
    }

    try {
        const [sales, forecast] = await Promise.all([
            apiFetch("/sales"),
            apiFetch(`/forecast/${productId}`)
        ]);

        const productSales = sales
            .filter(sale => sale.product_id === Number(productId))
            .sort((a, b) => new Date(a.sale_date) - new Date(b.sale_date));

        empty.style.display = "none";
        body.style.display = "block";

        const labels = productSales.map(sale => sale.sale_date);
        const actualData = productSales.map(sale => sale.quantity);
        const forecastValue = forecast.average_daily_demand;

        const forecastLabels = [];
        const today = new Date();
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            forecastLabels.push(date.toISOString().split("T")[0]);
        }

        const allLabels = [...labels, ...forecastLabels];
        const forecastData = [
            ...new Array(actualData.length).fill(null),
            ...new Array(7).fill(forecastValue)
        ];

        if (forecastChart) forecastChart.destroy();

        const ctx = document.getElementById("forecast-chart").getContext("2d");
        forecastChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: "Actual sales",
                        data: [...actualData, ...new Array(7).fill(null)],
                        borderColor: "#1f6f54",
                        backgroundColor: "rgba(31,111,84,0.08)",
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: "Forecast",
                        data: forecastData,
                        borderColor: "#b6720f",
                        borderDash: [5, 5],
                        borderWidth: 2,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: { family: "IBM Plex Sans" } } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Units sold", font: { family: "IBM Plex Sans" } }
                    },
                    x: {
                        title: { display: true, text: "Date", font: { family: "IBM Plex Sans" } }
                    }
                }
            }
        });

        document.getElementById("forecast-info").innerHTML = `
            <span>Average daily demand<strong>${forecast.average_daily_demand} units</strong></span>
            <span>7-day forecast<strong>${forecast.forecast_next_7_days} units</strong></span>
        `;

    } catch (error) {
        console.error("Error loading forecast:", error);
        showToast("Could not load forecast for this product.", "err");
    }
}

// ============================================================
// Replenishment dropdown + single recommendation + create PO
// ============================================================

let currentReplenishment = null;

async function loadProductsForReplenishment() {
    const products = productsCache.length ? productsCache : await apiFetch("/products");
    populateSelect(
        document.getElementById("productSelect"),
        products,
        "Select a product",
        p => p.name
    );
}

function resetReplenishmentCard(message) {
    ["currentStock", "dailyDemand", "leadTime", "safetyStock", "reorderPoint", "suggestedOrder"]
        .forEach(id => document.getElementById(id).textContent = "—");

    const msg = document.getElementById("replenishmentMessage");
    msg.textContent = message;
    msg.className = "rec-message neutral";

    document.getElementById("create-po-btn").disabled = true;
    currentReplenishment = null;
}

async function loadReplenishment(productId) {
    if (!productId) {
        resetReplenishmentCard("Select a product to view its recommendation.");
        return;
    }

    try {
        const data = await apiFetch(`/replenishment/${productId}`);
        currentReplenishment = data;

        document.getElementById("currentStock").textContent = data.current_stock;
        document.getElementById("dailyDemand").textContent = data.average_daily_demand;
        document.getElementById("leadTime").textContent = `${data.lead_time} days`;
        document.getElementById("safetyStock").textContent = data.safety_stock;
        document.getElementById("reorderPoint").textContent = data.reorder_point;
        document.getElementById("suggestedOrder").textContent = data.suggested_order_quantity;

        const message = document.getElementById("replenishmentMessage");
        const createBtn = document.getElementById("create-po-btn");

        if (data.reorder_required) {
            message.textContent = `Reorder required for ${data.product_name}. Suggested order: ${data.suggested_order_quantity} units.`;
            message.className = "rec-message warn";
            createBtn.disabled = data.suggested_order_quantity <= 0;
        } else {
            message.textContent = `Stock level is sufficient for ${data.product_name}.`;
            message.className = "rec-message good";
            createBtn.disabled = true;
        }

    } catch (error) {
        console.error("Error loading replenishment:", error);
        showToast("Could not load replenishment data.", "err");
    }
}

async function createPurchaseOrderFromRecommendation() {
    if (!currentReplenishment || currentReplenishment.suggested_order_quantity <= 0) return;

    const button = document.getElementById("create-po-btn");
    const message = document.getElementById("po-create-message");

    setButtonBusy(button, true, "Placing order…");
    message.textContent = "";
    message.className = "form-msg";

    try {
        await apiFetch("/purchase-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                product_id: currentReplenishment.product_id,
                quantity: currentReplenishment.suggested_order_quantity,
                status: "Pending",
                order_date: new Date().toISOString().split("T")[0]
            })
        });

        message.textContent = "Purchase order created.";
        message.classList.add("ok");
        showToast(`Purchase order placed for ${currentReplenishment.product_name}.`);

        await Promise.all([loadOrders(), loadOverview()]);

    } catch (error) {
        message.textContent = error.message;
        message.classList.add("err");
        showToast(error.message, "err");
    } finally {
        setButtonBusy(button, false);
    }
}

// ============================================================
// Purchase orders table
// ============================================================

async function loadOrders() {
    const table = document.getElementById("orders-table");

    try {
        const [orders, products] = await Promise.all([
            apiFetch("/purchase-orders"),
            productsCache.length ? Promise.resolve(productsCache) : apiFetch("/products")
        ]);

        ordersCache = orders;
        productsCache = products;

        if (orders.length === 0) {
            table.innerHTML = `<tr class="row-empty"><td colspan="6">No purchase orders yet. Create one from the Replenishment tab.</td></tr>`;
            return;
        }

        const productMap = new Map(products.map(p => [p.id, p]));

        table.innerHTML = [...orders].reverse().map(order => {
            const product = productMap.get(order.product_id);
            const productName = product ? product.name : `Product #${order.product_id}`;
            const isReceived = order.status === "Received";
            const pillClass = isReceived ? "pill-received" : "pill-pending";

            return `
                <tr>
                    <td>#${order.id}</td>
                    <td>${productName}</td>
                    <td class="num">${order.quantity}</td>
                    <td>${order.order_date}</td>
                    <td><span class="pill ${pillClass}">${order.status}</span></td>
                    <td style="text-align:right;">
                        ${isReceived ? "" : `<button class="btn btn-ghost btn-sm" data-receive="${order.id}"><span class="btn-label">Mark received</span></button>`}
                    </td>
                </tr>
            `;
        }).join("");

        table.querySelectorAll("[data-receive]").forEach(btn => {
            btn.addEventListener("click", () => receiveOrder(btn));
        });

    } catch (error) {
        console.error("Failed to load purchase orders:", error);
        table.innerHTML = `<tr class="row-empty"><td colspan="6">Could not load purchase orders.</td></tr>`;
    }
}

async function receiveOrder(button) {
    const orderId = button.dataset.receive;
    if (!confirm("Mark this order as received? This will add the ordered quantity back into stock.")) return;

    setButtonBusy(button, true, "Updating…");

    try {
        await apiFetch(`/purchase-orders/${orderId}/receive`, { method: "PATCH" });
        showToast("Order marked as received and stock updated.");
        await refreshAllData();
    } catch (error) {
        showToast(error.message, "err");
        setButtonBusy(button, false);
    }
}

// ============================================================
// Orchestration
// ============================================================

async function refreshAllData() {
    productsCache = [];
    await Promise.all([
        loadOverview(),
        loadInventory(),
        loadReplenishmentTable(),
        loadOrders(),
        loadSaleProducts(),
        loadForecastProducts(),
        loadProductsForReplenishment()
    ]);
}

document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    updateClock();
    setInterval(updateClock, 30000);

    document.getElementById("product-form").addEventListener("submit", addProduct);
    document.getElementById("sale-form").addEventListener("submit", recordSale);

    document.getElementById("forecast-product").addEventListener("change", function () {
        loadForecast(this.value);
    });

    document.getElementById("productSelect").addEventListener("change", function () {
        loadReplenishment(this.value);
    });

    document.getElementById("create-po-btn").addEventListener("click", createPurchaseOrderFromRecommendation);

    document.getElementById("inventory-search").addEventListener("input", renderInventoryTable);
    document.getElementById("inventory-filter").addEventListener("change", renderInventoryTable);

    document.getElementById("conn-retry").addEventListener("click", () => {
        checkConnection();
        refreshAllData();
    });

    checkConnection();
    refreshAllData();
    setInterval(checkConnection, 20000);
});
