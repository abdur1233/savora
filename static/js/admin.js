/* =========================================================
   SAVORA ADMIN DASHBOARD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = selector => document.querySelector(selector);

    const $$ = selector => document.querySelectorAll(selector);


    let allOrders = [];
    let allProducts = [];
    let currentSection = "dashboard";
    let unseenOrderCount = 0;


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function showSection(sectionName) {

        currentSection = sectionName;

        $$(".admin-section").forEach(section => {
            section.classList.remove("active");
        });

        $$(".sidebar-link").forEach(link => {
            link.classList.remove("active");
        });

        const section = $(`#${sectionName}Section`);

        if (section) {
            section.classList.add("active");
        }

        const activeLink =
            document.querySelector(
                `[data-section="${sectionName}"]`
            );

        if (activeLink) {
            activeLink.classList.add("active");
        }

        const titles = {
            dashboard: "Dashboard",
            orders: "Orders",
            products: "Products"
        };

        const pageTitle = $("#pageTitle");

        if (pageTitle) {
            pageTitle.textContent =
                titles[sectionName] || "Dashboard";
        }

        if (sectionName === "dashboard") {
            loadDashboard();
        }

        if (sectionName === "orders") {
            loadOrders();
            unseenOrderCount = 0;
            updateNewOrderBadge();
        }

        if (sectionName === "products") {
            loadProducts();
        }

        $("#sidebar")?.classList.remove("show");
    }


    $$(".sidebar-link").forEach(button => {

        button.addEventListener("click", () => {

            showSection(
                button.dataset.section
            );

        });

    });


    $$(".text-btn").forEach(button => {

        button.addEventListener("click", () => {

            showSection("orders");

        });

    });


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    $("#mobileToggle")?.addEventListener(
        "click",
        () => {

            $("#sidebar")?.classList.toggle("show");

        }
    );


    /* =====================================================
       LOAD ORDERS
    ===================================================== */

    async function loadOrders() {

        try {

            const response =
                await fetch("/api/orders");

            if (!response.ok) {
                throw new Error("Failed to load orders.");
            }

            allOrders =
                await response.json();

            renderOrders(allOrders);

        } catch (error) {

            console.error(error);

            $("#ordersTable").innerHTML = `
                <tr>
                    <td colspan="8">
                        Unable to load orders.
                    </td>
                </tr>
            `;

        }

    }


    /* =====================================================
       RENDER ORDERS
    ===================================================== */

    
        /* =====================================================
       PAGINATION HELPERS (SHARED)
    ===================================================== */

    function renderPaginationControls(containerId, currentPage, totalPages, onPageChange) {

        const container = $("#" + containerId);

        if (!container) return;

        container.innerHTML = "";

        if (totalPages <= 1) return;

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "‹ Prev";
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener("click", () => onPageChange(currentPage - 1));
        container.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.textContent = i;
            if (i === currentPage) pageBtn.classList.add("active");
            pageBtn.addEventListener("click", () => onPageChange(i));
            container.appendChild(pageBtn);
        }

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next ›";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener("click", () => onPageChange(currentPage + 1));
        container.appendChild(nextBtn);
    }


    /* =====================================================
       RENDER ORDERS (WITH PAGINATION)
    ===================================================== */

    let ordersCurrentPage = 1;
    const ORDERS_PER_PAGE = 8;
    let ordersFullList = [];

    function renderOrders(orders) {
        ordersFullList = orders;
        ordersCurrentPage = 1;
        renderOrdersPage();
    }

    function renderOrdersPage() {

        const table =
            $("#ordersTable");

        if (!table) return;

        table.innerHTML = "";

        if (ordersFullList.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="8">
                        No orders found.
                    </td>
                </tr>
            `;

            renderPaginationControls("ordersPagination", 1, 1, () => {});

            return;
        }

        const totalPages = Math.max(1, Math.ceil(ordersFullList.length / ORDERS_PER_PAGE));

        if (ordersCurrentPage > totalPages) {
            ordersCurrentPage = totalPages;
        }

        const startIndex = (ordersCurrentPage - 1) * ORDERS_PER_PAGE;
        const pageItems = ordersFullList.slice(startIndex, startIndex + ORDERS_PER_PAGE);


        pageItems.forEach(order => {

            const row =
                document.createElement("tr");

            const statusClass =
                order.status
                    .toLowerCase()
                    .replaceAll(" ", "-");


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(order.order_number)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(order.customer_name)}
                </td>

                <td>
                    ${escapeHTML(order.phone)}
                </td>

                <td>
                    <strong>
                        Rs. ${Number(order.total).toLocaleString()}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(order.payment_method)}
                </td>

                <td>

                    <select
                        class="status-select"
                        data-id="${order.id}">

                        ${statusOptions(order.status)}

                    </select>

                </td>

                <td>
                    ${formatDate(order.created_at)}
                </td>

                <td>

                    <button
                        class="action-btn view-order"
                        data-id="${order.id}">

                        <i class="fa-solid fa-eye"></i>

                    </button>

                </td>

            `;

            table.appendChild(row);

        });


        bindOrderButtons();

        renderPaginationControls("ordersPagination", ordersCurrentPage, totalPages, (page) => {
            ordersCurrentPage = page;
            renderOrdersPage();
        });

    }


    /* =====================================================
       STATUS OPTIONS
    ===================================================== */

    function statusOptions(current) {

        const statuses = [
            "Pending",
            "Confirmed",
            "Preparing",
            "Out for Delivery",
            "Delivered",
            "Cancelled"
        ];

        return statuses.map(status => {

            return `
                <option
                    value="${status}"
                    ${status === current ? "selected" : ""}>
                    ${status}
                </option>
            `;

        }).join("");

    }


    /* =====================================================
       ORDER BUTTONS
    ===================================================== */

    function bindOrderButtons() {

        $$(".view-order").forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openOrderDetails(
                        Number(button.dataset.id)
                    );

                }
            );

        });


        $$(".status-select").forEach(select => {

            select.addEventListener(
                "change",
                async () => {

                    await updateOrderStatus(
                        Number(select.dataset.id),
                        select.value
                    );

                }
            );

        });

    }


    /* =====================================================
       UPDATE STATUS
    ===================================================== */

    async function updateOrderStatus(
        orderId,
        status
    ) {

        try {

            const response =
                await fetch(
                    `/api/orders/${orderId}/status`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            status: status
                        })
                    }
                );


            const result =
                await response.json();


            if (!response.ok || !result.success) {

                alert(
                    result.message ||
                    "Could not update status."
                );

                return;

            }


            await loadOrders();

            await loadDashboard();

        } catch (error) {

            console.error(error);

            alert(
                "Server connection error."
            );

        }

    }


    /* =====================================================
       ORDER DETAILS
    ===================================================== */

    async function openOrderDetails(orderId) {

        try {

            const response =
                await fetch(
                    `/api/orders/${orderId}`
                );

            const result =
                await response.json();

            if (!result.success) {
                alert("Order not found.");
                return;
            }

            const order =
                result.order;


            $("#modalOrderNumber").textContent =
                order.order_number;


            const itemsHTML =
                order.items.map(item => {

                    return `
                        <div class="order-item-row">

                            <span>
                                ${escapeHTML(item.product_name)}
                                × ${item.quantity}
                            </span>

                            <strong>
                                Rs.
                                ${Number(
                                    item.item_total
                                ).toLocaleString()}
                            </strong>

                        </div>
                    `;

                }).join("");


            $("#orderDetailsContent").innerHTML = `

                <div class="order-detail-box">

                    <span>Customer</span>

                    <strong>
                        ${escapeHTML(order.customer_name)}
                    </strong>

                </div>


                <div class="order-detail-box">

                    <span>Phone</span>

                    <strong>
                        ${escapeHTML(order.phone)}
                    </strong>

                </div>


                <div class="order-detail-box">

                    <span>Email</span>

                    <strong>
                        ${escapeHTML(order.email)}
                    </strong>

                </div>


                <div class="order-detail-box">

                    <span>Delivery Address</span>

                    <strong>
                        ${escapeHTML(order.address)},
                        ${escapeHTML(order.city)}
                    </strong>

                </div>


                <div class="order-detail-box">

                    <span>Payment</span>

                    <strong>
                        ${escapeHTML(order.payment_method)}
                    </strong>

                </div>


                <div class="order-items-list">

                    <h3>Ordered Items</h3>

                    ${itemsHTML}

                </div>


                <div class="order-total">

                    <span>Total</span>

                    <strong>
                        Rs.
                        ${Number(
                            order.total
                        ).toLocaleString()}
                    </strong>

                </div>

            `;


            $("#orderModal")
                .classList.add("show");


        } catch (error) {

            console.error(error);

            alert(
                "Unable to load order details."
            );

        }

    }


    $("#closeOrderModal")?.addEventListener(
        "click",
        () => {

            $("#orderModal")
                ?.classList.remove("show");

        }
    );


    $("#orderModal")?.addEventListener(
        "click",
        event => {

            if (
                event.target === $("#orderModal")
            ) {

                $("#orderModal")
                    .classList.remove("show");

            }

        }
    );


    /* =====================================================
       DASHBOARD
    ===================================================== */

        async function loadDashboard() {

        try {

            const response =
                await fetch("/api/orders");

            allOrders =
                await response.json();


            const total =
                allOrders.length;


            const pending =
                allOrders.filter(
                    order =>
                        order.status === "Pending"
                ).length;


            const delivered =
                allOrders.filter(
                    order =>
                        order.status === "Delivered"
                ).length;


            const revenue =
                allOrders
                    .filter(
                        order =>
                            order.status !== "Cancelled"
                    )
                    .reduce(
                        (
                            sum,
                            order
                        ) =>
                            sum +
                            Number(order.total),
                        0
                    );


            $("#totalOrders").textContent =
                total;


            $("#pendingOrders").textContent =
                pending;


            $("#deliveredOrders").textContent =
                delivered;


            $("#totalRevenue").textContent =
                "Rs. " +
                revenue.toLocaleString();


            renderRecentOrders(
                allOrders.slice(0, 5)
            );


            /* TODAY'S SALES + BEST SELLER */

            loadTodayAnalytics();


        } catch (error) {

            console.error(
                "Dashboard error:",
                error
            );

        }

    }


    async function loadTodayAnalytics() {

        try {

            const response =
                await fetch("/api/analytics/today");

            const data =
                await response.json();

            const todaySalesEl = $("#todaySales");
            const bestSellerEl = $("#bestSellerName");

            if (todaySalesEl) {
                todaySalesEl.textContent =
                    "Rs. " + Number(data.today_sales || 0).toLocaleString();
            }

            if (bestSellerEl) {
                bestSellerEl.textContent =
                    data.best_seller_name && data.best_seller_name !== "N/A"
                        ? `${data.best_seller_name} (${data.best_seller_quantity} sold)`
                        : "N/A";
            }

        } catch (error) {

            console.error(
                "Today analytics error:",
                error
            );

        }

    }
    

    /* =====================================================
       RECENT ORDERS
    ===================================================== */

    function renderRecentOrders(orders) {

        const table =
            $("#recentOrdersTable");

        if (!table) return;

        table.innerHTML = "";


        if (orders.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="6">
                        No orders yet.
                    </td>
                </tr>
            `;

            return;

        }


        orders.forEach(order => {

            const statusClass =
                order.status
                    .toLowerCase()
                    .replaceAll(" ", "-");


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            order.order_number
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        order.customer_name
                    )}
                </td>

                <td>
                    <strong>
                        Rs.
                        ${Number(
                            order.total
                        ).toLocaleString()}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        order.payment_method
                    )}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${escapeHTML(
                            order.status
                        )}
                    </span>
                </td>

                <td>
                    ${formatDate(
                        order.created_at
                    )}
                </td>

            `;


            table.appendChild(row);

        });

    }


    /* =====================================================
       SEARCH ORDERS
    ===================================================== */

    $("#orderSearch")?.addEventListener(
        "input",
        filterOrders
    );


    $("#statusFilter")?.addEventListener(
        "change",
        filterOrders
    );


    function filterOrders() {

        const search =
            $("#orderSearch")
                ?.value
                .toLowerCase()
                .trim() || "";


        const status =
            $("#statusFilter")
                ?.value || "all";


        const filtered =
            allOrders.filter(order => {

                const matchesSearch =
                    order.order_number
                        .toLowerCase()
                        .includes(search) ||

                    order.customer_name
                        .toLowerCase()
                        .includes(search) ||

                    order.phone
                        .toLowerCase()
                        .includes(search);


                const matchesStatus =
                    status === "all" ||
                    order.status === status;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            });


        renderOrders(filtered);

    }


    /* =====================================================
       PRODUCTS
    ===================================================== */

    async function loadProducts() {

        try {

            const response =
                await fetch(
                    "/api/products"
                );

            allProducts =
                await response.json();

            renderProducts(allProducts);

        } catch (error) {

            console.error(error);

        }

    }


    
        let productsCurrentPage = 1;
    const PRODUCTS_PER_PAGE = 9;
    let productsFullList = [];

    function renderProducts(products) {
        productsFullList = products;
        productsCurrentPage = 1;
        renderProductsPage();
        renderLowStockAlert(products);
    }


    function renderLowStockAlert(products) {

        const panel = $("#lowStockPanel");
        const list = $("#lowStockList");

        if (!panel || !list) return;

        const lowStockItems = products
            .filter(
                product =>
                    Number(product.available) === 1 &&
                    Number(product.stock) < 5
            )
            .sort(
                (a, b) =>
                    Number(a.stock) - Number(b.stock)
            );

        if (lowStockItems.length === 0) {
            panel.style.display = "none";
            list.innerHTML = "";
            return;
        }

        panel.style.display = "block";

        list.innerHTML = lowStockItems.map(product => {

            const stock = Number(product.stock);
            const isOut = stock <= 0;

            const thumb = product.image
                ? `<img
                        class="low-stock-thumb"
                        src="${escapeHTML(product.image)}"
                        alt="${escapeHTML(product.name)}"
                    >`
                : `<span class="low-stock-thumb-fallback">
                        <i class="fa-solid fa-utensils"></i>
                    </span>`;

            return `
                <div class="low-stock-item">

                    ${thumb}

                    <div class="low-stock-info">
                        <strong>${escapeHTML(product.name)}</strong>
                        <span>${escapeHTML(product.category || "")}</span>
                    </div>

                    <span class="low-stock-badge ${
                        isOut ? "critical" : "warning"
                    }">
                        <i class="fa-solid ${
                            isOut
                                ? "fa-circle-xmark"
                                : "fa-triangle-exclamation"
                        }"></i>
                        ${
                            isOut
                                ? "Out of stock"
                                : `Only ${stock} left`
                        }
                    </span>

                </div>
            `;

        }).join("");

    }

    function renderProductsPage() {

        const grid =
            $("#productsGrid");

        if (!grid) return;

        grid.innerHTML = "";


        if (productsFullList.length === 0) {

            grid.innerHTML =
                "<p>No products found.</p>";

            renderPaginationControls("productsPagination", 1, 1, () => {});

            return;

        }

        const totalPages = Math.max(1, Math.ceil(productsFullList.length / PRODUCTS_PER_PAGE));

        if (productsCurrentPage > totalPages) {
            productsCurrentPage = totalPages;
        }

        const startIndex = (productsCurrentPage - 1) * PRODUCTS_PER_PAGE;
        const pageItems = productsFullList.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);


        pageItems.forEach(product => {

            const card =
                document.createElement("div");

            card.className =
                "admin-product-card";


            card.innerHTML = `

                <div class="admin-product-image">

                    <img
                        src="${escapeHTML(
                            product.image || ""
                        )}"
                        alt="${escapeHTML(
                            product.name
                        )}">

                </div>


                <div class="admin-product-body">

                    <h3>
                        ${escapeHTML(
                            product.name
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            product.description || ""
                        )}
                    </p>


                    <div class="admin-product-meta">

                        <strong>
                            Rs.
                            ${Number(
                                product.price
                            ).toLocaleString()}
                        </strong>

                        <span>
                            ⭐
                            ${product.rating}
                        </span>

                        <span style="${
                            Number(product.stock) <= 0
                                ? "color:#d9363e; font-weight:600;"
                                : Number(product.stock) < 5
                                    ? "color:#f25c05; font-weight:600;"
                                    : ""
                        }">
                            ${
                                Number(product.stock) <= 0
                                    ? "Out of stock"
                                    : `Stock: ${Number(product.stock)}`
                            }
                        </span>

                    </div>


                    <div class="product-actions">

                        <button
                            class="edit-product"
                            data-id="${product.id}">

                            <i class="fa-solid fa-pen"></i>
                            Edit

                        </button>


                        <button
                            class="delete-product"
                            data-id="${product.id}">

                            <i class="fa-solid fa-trash"></i>
                            Delete

                        </button>

                    </div>

                </div>

            `;


            grid.appendChild(card);

        });


        bindProductButtons();

        renderPaginationControls("productsPagination", productsCurrentPage, totalPages, (page) => {
            productsCurrentPage = page;
            renderProductsPage();
        });

    }


    function bindProductButtons() {

        $$(".edit-product").forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const product =
                        allProducts.find(
                            item =>
                                item.id ===
                                Number(
                                    button.dataset.id
                                )
                        );

                    if (product) {
                        openProductModal(
                            product
                        );
                    }

                }
            );

        });


        $$(".delete-product").forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    deleteProduct(
                        Number(
                            button.dataset.id
                        )
                    );

                }
            );

        });

    }


    /* =====================================================
       PRODUCT MODAL
    ===================================================== */

    $("#addProductBtn")?.addEventListener(
        "click",
        () => {

            openProductModal();

        }
    );


    /* =====================================================
       CUSTOMIZATION HELPERS
       (Sizes / Add-ons are typed as "Name:Price, Name:Price"
        Spice Levels are typed as "Name, Name, Name")
    ===================================================== */

    function parseNamePriceList(text) {

        return (text || "")
            .split(",")
            .map(part => part.trim())
            .filter(part => part.length > 0)
            .map(part => {

                const pieces = part.split(":");

                const name =
                    (pieces[0] || "").trim();

                const price =
                    Number(
                        (pieces[1] || "0").trim()
                    ) || 0;

                return { name, price };

            })
            .filter(entry => entry.name.length > 0);

    }

    function parseNameList(text) {

        return (text || "")
            .split(",")
            .map(part => part.trim())
            .filter(part => part.length > 0);

    }

    function formatNamePriceList(list) {

        if (!Array.isArray(list)) return "";

        return list
            .filter(entry => entry && entry.name)
            .map(entry => `${entry.name}:${entry.price ?? 0}`)
            .join(", ");

    }

    function formatNameList(list) {

        if (!Array.isArray(list)) return "";

        return list
            .filter(name => !!name)
            .join(", ");

    }

    function parseProductCustomizations(product) {

        try {

            const raw =
                product && product.customizations;

            if (!raw) return {};

            return typeof raw === "string"
                ? JSON.parse(raw)
                : raw;

        } catch (error) {

            return {};

        }

    }


    function openProductModal(product = null) {

        $("#productModal")
            ?.classList.add("show");


        if (!product) {

            $("#productModalTitle")
                .textContent =
                "Add Product";

            $("#productForm")
                .reset();

            $("#productId")
                .value = "";

            return;

        }


        $("#productModalTitle")
            .textContent =
            "Edit Product";


        $("#productId").value =
            product.id;

        $("#productName").value =
            product.name;

        $("#productCategory").value =
            product.category;

        $("#productPrice").value =
            product.price;

        $("#productRating").value =
            product.rating;

        $("#productStock").value =
            product.stock ?? 50;

        $("#productImage").value =
            product.image || "";

        $("#productDescription").value =
            product.description || "";

        $("#productDelivery").value =
            product.delivery_time || 20;

        $("#productBadge").value =
            product.badge || "";

        const customizations =
            parseProductCustomizations(product);

        $("#productSizes").value =
            formatNamePriceList(
                customizations.sizes
            );

        $("#productAddons").value =
            formatNamePriceList(
                customizations.addons
            );

        $("#productSpiceLevels").value =
            formatNameList(
                customizations.spice_levels
            );

    }


    $("#closeProductModal")?.addEventListener(
        "click",
        () => {

            $("#productModal")
                ?.classList.remove("show");

        }
    );


    /* =====================================================
       SAVE PRODUCT
    ===================================================== */

    $("#productForm")?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                $("#productId").value;


            const product = {

                name:
                    $("#productName").value.trim(),

                category:
                    $("#productCategory").value,

                price:
                    Number(
                        $("#productPrice").value
                    ),

                rating:
                    Number(
                        $("#productRating").value
                    ),

                stock:
                    Number(
                        $("#productStock").value
                    ),

                image:
                    $("#productImage").value.trim(),

                description:
                    $("#productDescription")
                        .value
                        .trim(),

                delivery_time:
                    Number(
                        $("#productDelivery")
                            .value
                    ),

                badge:
                    $("#productBadge")
                        .value
                        .trim(),

                customizations:
                    JSON.stringify({

                        sizes: parseNamePriceList(
                            $("#productSizes").value
                        ),

                        addons: parseNamePriceList(
                            $("#productAddons").value
                        ),

                        spice_levels: parseNameList(
                            $("#productSpiceLevels").value
                        )

                    })

            };


            try {

                const url =
                    id
                        ? `/api/products/${id}`
                        : "/api/products";


                const method =
                    id
                        ? "PUT"
                        : "POST";


                const response =
                    await fetch(
                        url,
                        {
                            method: method,

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    product
                                )
                        }
                    );


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    alert(
                        result.message ||
                        "Could not save product."
                    );

                    return;

                }


                $("#productModal")
                    .classList.remove("show");


                await loadProducts();


                alert(
                    id
                        ? "Product updated successfully."
                        : "Product added successfully."
                );


            } catch (error) {

                console.error(error);

                alert(
                    "Server connection error."
                );

            }

        }
    );


    /* =====================================================
       DELETE PRODUCT
    ===================================================== */

    async function deleteProduct(id) {

        const confirmed =
            confirm(
                "Are you sure you want to delete this product?"
            );


        if (!confirmed) return;


        try {

            const response =
                await fetch(
                    `/api/products/${id}`,
                    {
                        method: "DELETE"
                    }
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.success
            ) {

                alert(
                    result.message ||
                    "Could not delete product."
                );

                return;

            }


            await loadProducts();

            alert(
                "Product deleted successfully."
            );


        } catch (error) {

            console.error(error);

            alert(
                "Server connection error."
            );

        }

    }


    /* =====================================================
       REFRESH
    ===================================================== */

    $("#refreshOrders")?.addEventListener(
        "click",
        async () => {

            await loadOrders();
            await loadDashboard();

        }
    );


    /* =====================================================
       HELPERS
    ===================================================== */

    function formatDate(dateString) {

        if (!dateString) {
            return "-";
        }

        const date =
            new Date(
                dateString.replace(" ", "T")
            );

        if (isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString(
            "en-PK",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       LIVE DASHBOARD (Server-Sent Events)
       Pushes new orders / status changes into the admin
       panel instantly, with a sound + toast + badge —
       no manual refresh needed.
    ===================================================== */

    function updateNewOrderBadge() {

        const badge = $("#newOrderBadge");

        if (!badge) return;

        if (unseenOrderCount > 0) {
            badge.style.display = "flex";
            badge.textContent =
                unseenOrderCount > 9
                    ? "9+"
                    : unseenOrderCount;
        } else {
            badge.style.display = "none";
        }

    }


    function setLiveIndicator(state) {

        const el = $("#liveIndicator");
        const label = $("#liveIndicatorLabel");

        if (!el || !label) return;

        el.classList.remove("connected", "disconnected");

        if (state === "connected") {
            el.classList.add("connected");
            label.textContent = "Live";
        } else if (state === "disconnected") {
            el.classList.add("disconnected");
            label.textContent = "Reconnecting…";
        } else {
            label.textContent = "Connecting…";
        }

    }


    function playNotificationSound() {

        try {

            const AudioCtx =
                window.AudioContext ||
                window.webkitAudioContext;

            const ctx = new AudioCtx();

            const playTone = (freq, startTime, duration) => {

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(
                    0.0001,
                    startTime
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.18,
                    startTime + 0.02
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    startTime + duration
                );

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);

            };

            const now = ctx.currentTime;

            playTone(880, now, 0.15);
            playTone(1175, now + 0.14, 0.2);

        } catch (err) {

            // Autoplay can be blocked before the first
            // user interaction on the page — that's fine,
            // the toast + badge still show either way.

        }

    }


    function ensureToastContainer() {

        let container = $(".live-toast-container");

        if (!container) {

            container = document.createElement("div");
            container.className = "live-toast-container";
            document.body.appendChild(container);

        }

        return container;

    }


    function showLiveToast(title, subtitle) {

        const container = ensureToastContainer();

        const toast = document.createElement("div");
        toast.className = "live-toast";

        toast.innerHTML = `
            <div class="live-toast-icon">
                <i class="fa-solid fa-bag-shopping"></i>
            </div>
            <div class="live-toast-body">
                <strong>${escapeHTML(title)}</strong>
                <span>${escapeHTML(subtitle)}</span>
            </div>
        `;

        toast.addEventListener("click", () => {
            showSection("orders");
        });

        container.appendChild(toast);

        setTimeout(() => {

            toast.classList.add("leaving");

            setTimeout(() => {
                toast.remove();
            }, 250);

        }, 6000);

    }


    function connectLiveDashboard() {

        if (!window.EventSource) {
            setLiveIndicator("disconnected");
            return;
        }

        const source = new EventSource(
            "/api/admin/stream"
        );

        source.addEventListener("connected", () => {
            setLiveIndicator("connected");
        });

        source.onopen = () => {
            setLiveIndicator("connected");
        };

        source.onerror = () => {
            setLiveIndicator("disconnected");
        };

        source.onmessage = (event) => {

            let payload;

            try {
                payload = JSON.parse(event.data);
            } catch (err) {
                return;
            }

            if (payload.type === "new_order") {

                const order = payload.data;

                playNotificationSound();

                showLiveToast(
                    "New Order Received!",
                    `${order.order_number} · Rs. ${
                        Number(order.total).toLocaleString()
                    } · ${order.item_count} item(s)`
                );

                if (currentSection !== "orders") {
                    unseenOrderCount += 1;
                    updateNewOrderBadge();
                }

                if (currentSection === "orders") {
                    loadOrders();
                }

                if (currentSection === "dashboard") {
                    loadDashboard();
                }

            }

            if (payload.type === "order_status_changed") {

                if (currentSection === "orders") {
                    loadOrders();
                }

            }

        };

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    loadDashboard();

    connectLiveDashboard();

    console.log(
        "Savora Admin Dashboard loaded."
    );

});