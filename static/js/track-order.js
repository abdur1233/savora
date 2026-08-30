document.addEventListener("DOMContentLoaded", () => {

    const $ = (selector) =>
        document.querySelector(selector);

    const form = $("#trackForm");
    const orderInput = $("#trackOrderNumber");
    const phoneInput = $("#trackPhone");
    const submitBtn = $("#trackSubmitBtn");

    const errorBox = $("#trackError");
    const resultBox = $("#trackResult");


    /* =========================================
       STATUS TIMELINE CONFIG
    ========================================= */

    const TIMELINE_STEPS = [
        { key: "Pending", label: "Pending", icon: "fa-receipt" },
        { key: "Confirmed", label: "Confirmed", icon: "fa-check" },
        { key: "Preparing", label: "Preparing", icon: "fa-kitchen-set" },
        { key: "Out for Delivery", label: "On the way", icon: "fa-motorcycle" },
        { key: "Delivered", label: "Delivered", icon: "fa-house" }
    ];

    function statusToClass(status) {
        return String(status || "")
            .toLowerCase()
            .replace(/\s+/g, "-");
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatMoney(value) {
        return "Rs. " + Number(value || 0)
            .toLocaleString();
    }

    function formatDate(dateString) {

        if (!dateString) return "-";

        const date = new Date(
            dateString.replace(" ", "T")
        );

        if (isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

    }


    /* =========================================
       PREFILL FROM QUERY STRING
       (used by the "Track This Order" button
        on the order-success screen)
    ========================================= */

    const params = new URLSearchParams(
        window.location.search
    );

    const prefillOrder = params.get("order");
    const prefillPhone = params.get("phone");

    if (prefillOrder) {
        orderInput.value = prefillOrder;
    }

    if (prefillPhone) {
        phoneInput.value = prefillPhone;
    }

    if (prefillOrder && prefillPhone) {
        // Auto-submit once the DOM is ready.
        setTimeout(() => {
            form.requestSubmit
                ? form.requestSubmit()
                : lookupOrder();
        }, 50);
    }


    /* =========================================
       RENDER TIMELINE
    ========================================= */

    function renderTimeline(status) {

        const container = $("#resultTimeline");

        if (status === "Cancelled") {

            container.innerHTML = `
                <div class="track-timeline-step cancelled" style="flex:1;">
                    <div class="track-timeline-icon">
                        <i class="fa-solid fa-xmark"></i>
                    </div>
                    <div class="track-timeline-label">
                        Order Cancelled
                    </div>
                </div>
            `;

            return;
        }

        const currentIndex = TIMELINE_STEPS.findIndex(
            step => step.key === status
        );

        container.innerHTML = TIMELINE_STEPS.map(
            (step, index) => {

                const done = currentIndex >= index;

                return `
                    <div class="track-timeline-step ${done ? "done" : ""}">
                        <div class="track-timeline-icon">
                            <i class="fa-solid ${step.icon}"></i>
                        </div>
                        <div class="track-timeline-label">
                            ${step.label}
                        </div>
                    </div>
                `;

            }
        ).join("");

    }


    /* =========================================
       RENDER RESULT
    ========================================= */

    function renderResult(order) {

        $("#resultOrderNumber").textContent =
            order.order_number;

        const badge = $("#resultStatusBadge");
        badge.textContent = order.status;
        badge.className =
            "track-status-badge " +
            statusToClass(order.status);

        renderTimeline(order.status);

        $("#resultAddress").textContent =
            `${order.address}, ${order.city}`;

        $("#resultPayment").textContent =
            `${order.payment_method} · ${order.payment_status}`;

        $("#resultPlacedOn").textContent =
            formatDate(order.created_at);

        $("#resultItemsList").innerHTML =
            (order.items || []).map(item => `
                <div class="track-item-row">

                    ${
                        item.image
                            ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.product_name)}">`
                            : `<div class="track-item-row-info-icon"></div>`
                    }

                    <div class="track-item-row-info">
                        <strong>${escapeHTML(item.product_name)}</strong>
                        <span>Qty: ${item.quantity}</span>
                    </div>

                    <div class="track-item-row-total">
                        ${formatMoney(item.item_total)}
                    </div>

                </div>
            `).join("");

        $("#resultSubtotal").textContent =
            formatMoney(order.subtotal);

        $("#resultDelivery").textContent =
            Number(order.delivery_fee) > 0
                ? formatMoney(order.delivery_fee)
                : "Free";

        const discountRow = $("#resultDiscountRow");

        if (Number(order.discount) > 0) {
            discountRow.style.display = "flex";
            $("#resultDiscount").textContent =
                "- " + formatMoney(order.discount);
        } else {
            discountRow.style.display = "none";
        }

        $("#resultTotal").textContent =
            formatMoney(order.total);

        resultBox.style.display = "block";

        resultBox.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /* =========================================
       LOOKUP ORDER
    ========================================= */

    async function lookupOrder() {

        errorBox.style.display = "none";
        resultBox.style.display = "none";

        const orderNumber = orderInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!orderNumber || !phone) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.querySelector(".btn-label").textContent =
            "Searching...";

        try {

            const response = await fetch(
                "/api/track-order",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        order_number: orderNumber,
                        phone: phone
                    })
                }
            );

            const data = await response.json();

            if (!data.success) {

                errorBox.textContent =
                    data.message ||
                    "No matching order found.";

                errorBox.style.display = "block";

                return;

            }

            renderResult(data.order);

        } catch (err) {

            console.error("TRACK ORDER ERROR:", err);

            errorBox.textContent =
                "Something went wrong. Please try again.";

            errorBox.style.display = "block";

        } finally {

            submitBtn.disabled = false;
            submitBtn.querySelector(".btn-label").textContent =
                "Track Order";

        }

    }


    form.addEventListener("submit", (e) => {
        e.preventDefault();
        lookupOrder();
    });

});
