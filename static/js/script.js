/* =========================================
   SAVORA FOOD WEBSITE - PHASE 4
   DATABASE + API + CART + CHECKOUT
========================================= */

document.addEventListener("DOMContentLoaded", () => {




      
    

    /* =========================================
       HELPER FUNCTIONS
    ========================================= */

    const $ = (selector) => document.querySelector(selector);

    const $$ = (selector) => document.querySelectorAll(selector);

    const on = (element, event, callback) => {
        if (element) {
            element.addEventListener(event, callback);
        }
    };





    /* =====================================================
       PHONE NUMBER: ONLY ALLOW DIGITS
    ===================================================== */

    const phoneInput = $("#customerPhone");

    if (phoneInput) {

        phoneInput.addEventListener("input", () => {

            phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "");

        });

    }


    /* =========================================
       DATABASE PRODUCTS
    ========================================= */

    let products = [];

    async function loadProducts() {

        const menuContainer =
            document.querySelector("#menuGrid") ||
            document.querySelector(".menu-grid") ||
            document.querySelector("#foodGrid") ||
            document.querySelector(".food-grid");

        
                    if (!menuContainer) {
            console.warn("Food/menu container not found.");
            return;
        }

        /* SHOW SKELETON WHILE FETCHING */

        menuContainer.innerHTML = Array.from({ length: 6 }).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-photo skeleton-shimmer"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line skeleton-shimmer w-60"></div>
                    <div class="skeleton-line skeleton-shimmer w-90"></div>
                    <div class="skeleton-line skeleton-shimmer w-40"></div>
                </div>
            </div>
        `).join("");

        try {

            const response = await fetch("/api/products");

            if (!response.ok) {
                throw new Error("Failed to fetch products");
            }

            products = await response.json();

            console.log(
                "Products loaded from SQLite:",
                products
            );

            renderProducts(products);

        } catch (error) {

            console.error(
                "Product loading error:",
                error
            );

            menuContainer.innerHTML = `
                <div class="products-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>Unable to load menu</h3>
                    <p>Please make sure the Flask server is running.</p>
                </div>
            `;
        }
    }


    /* =========================================
       RENDER PRODUCTS
    ========================================= */

    function renderProducts(productList) {

        const menuContainer =
            document.querySelector("#menuGrid") ||
            document.querySelector(".menu-grid") ||
            document.querySelector("#foodGrid") ||
            document.querySelector(".food-grid");

        if (!menuContainer) {
            console.warn(
                "Add #menuGrid or .menu-grid to your HTML."
            );
            return;
        }

        if (!productList || productList.length === 0) {

            menuContainer.innerHTML = `
                <div class="products-error">
                    <i class="fa-solid fa-utensils"></i>
                    <h3>No food available</h3>
                    <p>Please check back later.</p>
                </div>
            `;

            return;
        }

        menuContainer.innerHTML = "";

        productList.forEach(product => {

            const card = document.createElement("article");

            card.className = "food-card";

            card.dataset.category =
                String(product.category || "")
                    .toLowerCase()
                    .trim();

            const image =
                product.image ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";

            const rating =
                Number(product.rating || 0);

            const stars =
                createStars(rating);

            const stock =
                Number(product.stock ?? 999);

            const isOutOfStock =
                stock <= 0;

            card.innerHTML = `

                <div class="food-image">

                    <img
                        src="${escapeAttribute(image)}"
                        alt="${escapeAttribute(product.name)}"
                        loading="lazy"
                    >

                    <button
                        type="button"
                        class="favorite heart-btn"
                        aria-label="Add to favorites">

                        <i class="fa-regular fa-heart"></i>

                    </button>

                    ${
                        isOutOfStock
                            ? `<span class="out-of-stock-badge" style="
                                position:absolute;
                                top:10px;
                                left:10px;
                                background:#d9363e;
                                color:#fff;
                                padding:4px 10px;
                                border-radius:6px;
                                font-size:12px;
                                font-weight:600;
                            ">Out of Stock</span>`
                            : (
                                stock < 5
                                    ? `<span class="low-stock-badge" style="
                                        position:absolute;
                                        top:10px;
                                        left:10px;
                                        background:#f25c05;
                                        color:#fff;
                                        padding:4px 10px;
                                        border-radius:6px;
                                        font-size:12px;
                                        font-weight:600;
                                    ">Only ${stock} left</span>`
                                    : ""
                            )
                    }

                </div>


                <div class="food-content">

                    <span class="food-category">
                        ${escapeHTML(product.category || "")}
                    </span>

                    <h3>
                        ${escapeHTML(product.name || "")}
                    </h3>

                    <p>
                        ${escapeHTML(product.description || "")}
                    </p>

                    <div class="food-rating">

                        <span class="stars">
                            ${stars}
                        </span>

                        <span>
                            ${rating.toFixed(1)}
                        </span>

                    </div>


                    <div class="food-bottom">

                        <strong>
                            Rs. ${Number(
                                product.price || 0
                            ).toLocaleString()}
                        </strong>


                        <button
                            type="button"
                            class="add-btn"
                            data-id="${product.id || ""}"
                            data-name="${escapeAttribute(
                                product.name || ""
                            )}"
                            data-price="${product.price || 0}"
                            data-image="${escapeAttribute(
                                image
                            )}"
                            ${isOutOfStock ? "disabled" : ""}
                            style="${
                                isOutOfStock
                                    ? "opacity:0.5; cursor:not-allowed;"
                                    : ""
                            }">

                            <i class="fa-solid fa-plus"></i>
                            ${isOutOfStock ? "Out of Stock" : "Add"}

                        </button>

                    </div>

                </div>

            `;

            menuContainer.appendChild(card);

        });

        attachProductEvents();
    }


    /* =========================================
       STAR RATING
    ========================================= */

    function createStars(rating) {

        let html = "";

        const rounded =
            Math.round(Number(rating));

        for (let i = 1; i <= 5; i++) {

            if (i <= rounded) {

                html += `
                    <i class="fa-solid fa-star"></i>
                `;

            } else {

                html += `
                    <i class="fa-regular fa-star"></i>
                `;
            }
        }

        return html;
    }


    /* =========================================
       PRODUCT EVENTS
    ========================================= */

    function attachProductEvents() {

        $$(".add-btn, .add-cart").forEach(button => {

            on(button, "click", event => {

                event.preventDefault();

                const id =
                    button.dataset.id;

                const name =
                    button.dataset.name;

                const price =
                    Number(button.dataset.price);

                const image =
                    button.dataset.image || "";

                if (!name || !price) {

                    console.warn(
                        "Product name or price missing.",
                        button
                    );

                    return;
                }

                addToCart(
                    id,
                    name,
                    price,
                    image
                );

            });

        });


        $$(".favorite, .heart-btn").forEach(button => {

            on(button, "click", event => {

                event.preventDefault();
                event.stopPropagation();

                button.classList.toggle("liked");

                const icon =
                    button.querySelector("i");

                if (!icon) return;

                if (
                    button.classList.contains("liked")
                ) {

                    icon.classList.remove(
                        "fa-regular"
                    );

                    icon.classList.add(
                        "fa-solid"
                    );

                } else {

                    icon.classList.remove(
                        "fa-solid"
                    );

                    icon.classList.add(
                        "fa-regular"
                    );
                }

            });

        });

    }


    /* =========================================
       MOBILE MENU
    ========================================= */

    const mobileMenu = $("#mobileMenu");
    const nav = $("#nav");

    on(mobileMenu, "click", () => {

        if (!nav) return;

        nav.classList.toggle("show");

        const icon =
            mobileMenu.querySelector("i");

        if (icon) {

            if (nav.classList.contains("show")) {

                icon.classList.remove("fa-bars");
                icon.classList.add("fa-xmark");

            } else {

                icon.classList.remove("fa-xmark");
                icon.classList.add("fa-bars");
            }
        }

    });


    $$("#nav a").forEach(link => {

        on(link, "click", () => {

            nav?.classList.remove("show");

            const icon =
                mobileMenu?.querySelector("i");

            if (icon) {

                icon.classList.remove("fa-xmark");
                icon.classList.add("fa-bars");
            }

        });

    });


    /* =========================================
       SEARCH MODAL
    ========================================= */

    const searchOpen = $(".search-open");
    const searchModal = $("#searchModal");
    const searchClose = $("#searchClose");
    const globalSearch = $("#globalSearch");
    const foodSearch = $("#foodSearch");


    on(searchOpen, "click", () => {

        if (!searchModal) return;

        searchModal.classList.add("show");

        document.body.style.overflow = "hidden";

        setTimeout(() => {

            globalSearch?.focus();

        }, 100);

    });


    on(searchClose, "click", () => {

        searchModal?.classList.remove("show");

        document.body.style.overflow = "";

    });


    on(searchModal, "click", event => {

        if (event.target === searchModal) {

            searchModal.classList.remove("show");

            document.body.style.overflow = "";
        }

    });


    /* =========================================
       SEARCH PRODUCTS
    ========================================= */

    function searchProducts(value) {

        const searchValue =
            String(value || "")
                .toLowerCase()
                .trim();

        $$(".food-card").forEach(card => {

            const text =
                card.textContent.toLowerCase();

            if (
                searchValue === "" ||
                text.includes(searchValue)
            ) {

                card.style.display = "";

            } else {

                card.style.display = "none";
            }

        });

    }


    on(foodSearch, "input", () => {

        searchProducts(
            foodSearch.value
        );

    });


    on(globalSearch, "input", () => {

        searchProducts(
            globalSearch.value
        );

    });


    /* =========================================
       CART
    ========================================= */

    const cartOpen = $("#cartOpen");
    const cartDrawer = $("#cartDrawer");
    const cartOverlay = $("#cartOverlay");
    const cartClose = $("#cartClose");
    const mobileCart = $("#mobileCart");

    let cart = [];


    try {

        cart =
            JSON.parse(
                localStorage.getItem("savoraCart")
            ) || [];

    } catch (error) {

        cart = [];
    }


    function saveCart() {

        localStorage.setItem(
            "savoraCart",
            JSON.stringify(cart)
        );

    }


    /* =========================================
       OPEN CART
    ========================================= */

    function openCart() {

        cartDrawer?.classList.add("show");

        cartOverlay?.classList.add("show");

        document.body.classList.add("cart-open");

    }


    /* =========================================
       CLOSE CART
    ========================================= */

    function closeCartDrawer() {

        cartDrawer?.classList.remove("show");

        cartOverlay?.classList.remove("show");

        document.body.classList.remove("cart-open");

    }


    on(cartOpen, "click", openCart);
    on(mobileCart, "click", openCart);
    on(cartClose, "click", closeCartDrawer);
    on(cartOverlay, "click", closeCartDrawer);


    /* =========================================
       UPDATE CART
    ========================================= */

    function updateCart() {

        const cartItems = $("#cartItems");
        const cartCount = $("#cartCount");
        const mobileCartCount = $("#mobileCartCount");

        const subtotalElement = $("#subtotal");
        const deliveryElement = $("#deliveryFee");
        const totalElement = $("#total");

        if (!cartItems) return;


        const totalItems =
            cart.reduce(
                (total, item) =>
                    total +
                    Number(item.quantity || 0),
                0
            );


        if (cartCount) {

            cartCount.textContent =
                totalItems;
        }


        if (mobileCartCount) {

            mobileCartCount.textContent =
                totalItems;
        }


        const subtotal =
            cart.reduce(
                (total, item) =>
                    total +
                    Number(item.price || 0) *
                    Number(item.quantity || 0),
                0
            );


        const delivery =
            subtotal === 0
                ? 0
                : subtotal >= 2000
                    ? 0
                    : 150;


        const discount =
            promoApplied && subtotal > 0
                ? Math.round(subtotal * 0.20)
                : 0;


        const total =
            subtotal -
            discount +
            delivery;


        if (subtotalElement) {

            subtotalElement.textContent =
                "Rs. " +
                subtotal.toLocaleString();
        }


        if (deliveryElement) {

            deliveryElement.textContent =
                delivery === 0
                    ? subtotal === 0
                        ? "Rs. 0"
                        : "FREE"
                    : "Rs. " +
                      delivery.toLocaleString();
        }


        if (totalElement) {

            totalElement.textContent =
                "Rs. " +
                total.toLocaleString();
        }


        /* EMPTY CART */

        if (cart.length === 0) {

            cartItems.innerHTML = `

                <div class="empty-cart">

                    <div class="empty-icon">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </div>

                    <h3>
                        Your bag is empty
                    </h3>

                    <p>
                        Add something delicious from our menu.
                    </p>

                    <button
                        class="btn btn-primary"
                        id="emptyCartMenu">

                        Explore Menu

                    </button>

                </div>

            `;


            on(
                $("#emptyCartMenu"),
                "click",
                () => {

                    closeCartDrawer();

                    document
                        .querySelector("#menu")
                        ?.scrollIntoView({
                            behavior: "smooth"
                        });

                }
            );

            return;
        }


        /* RENDER CART */

        cartItems.innerHTML = "";


        cart.forEach((item, index) => {

            const itemTotal =
                Number(item.price) *
                Number(item.quantity);


            const cartItem =
                document.createElement("div");


            cartItem.className =
                "cart-item";


            cartItem.innerHTML = `

                <div class="cart-item-info">

                    <h4>
                        ${escapeHTML(item.name)}
                    </h4>

                    <span>
                        Rs.
                        ${Number(
                            item.price
                        ).toLocaleString()}
                    </span>

                    <div class="cart-quantity">

                        <button
                            type="button"
                            class="quantity-minus"
                            data-index="${index}">

                            −

                        </button>

                        <strong>
                            ${item.quantity}
                        </strong>

                        <button
                            type="button"
                            class="quantity-plus"
                            data-index="${index}">

                            +

                        </button>

                    </div>

                </div>


                <div class="cart-item-right">

                    <strong>
                        Rs.
                        ${itemTotal.toLocaleString()}
                    </strong>

                    <button
                        type="button"
                        class="remove-item"
                        data-index="${index}"
                        aria-label="Remove item">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            `;


            cartItems.appendChild(cartItem);

        });


        $$(".quantity-plus").forEach(button => {

            on(button, "click", () => {

                changeQuantity(
                    Number(button.dataset.index),
                    1
                );

            });

        });


        $$(".quantity-minus").forEach(button => {

            on(button, "click", () => {

                changeQuantity(
                    Number(button.dataset.index),
                    -1
                );

            });

        });


        $$(".remove-item").forEach(button => {

            on(button, "click", () => {

                removeFromCart(
                    Number(button.dataset.index)
                );

            });

        });

    }


    /* =========================================
       ADD TO CART
    ========================================= */

    function addToCart(
        id,
        name,
        price,
        image = ""
    ) {

        const existing =
            cart.find(
                item => item.name === name
            );


        if (existing) {

            existing.quantity++;

        } else {

            cart.push({

                id: id,
                name: name,
                price: Number(price),
                quantity: 1,
                image: image

            });

        }


        saveCart();

        updateCart();

        openCart();

        showToast(
            `${name} added to your bag`
        );

    }


    /* =========================================
       CHANGE QUANTITY
    ========================================= */

    function changeQuantity(
        index,
        amount
    ) {

        if (!cart[index]) return;


        cart[index].quantity += amount;


        if (cart[index].quantity <= 0) {

            cart.splice(index, 1);
        }


        saveCart();

        updateCart();

    }


    /* =========================================
       REMOVE ITEM
    ========================================= */

    function removeFromCart(index) {

        if (!cart[index]) return;


        cart.splice(index, 1);

        saveCart();

        updateCart();

    }


    /* =========================================
       CATEGORY FILTER
    ========================================= */

    $$(".filter").forEach(button => {

        on(button, "click", () => {

            $$(".filter").forEach(item => {

                item.classList.remove("active");

            });


            button.classList.add("active");


            const category =
                (
                    button.dataset.category ||
                    "all"
                )
                .toLowerCase()
                .trim();


            $$(".food-card").forEach(card => {

                const cardCategory =
                    (
                        card.dataset.category ||
                        ""
                    )
                    .toLowerCase()
                    .trim();


                if (
                    category === "all" ||
                    cardCategory === category
                ) {

                    card.style.display = "";

                } else {

                    card.style.display = "none";
                }

            });

        });

    });


    /* =========================================
       PROMO CODE
    ========================================= */

    const copyPromo = $("#copyPromo");

    on(copyPromo, "click", async () => {

        const promo = "WELCOME20";

        try {

            await navigator.clipboard.writeText(
                promo
            );

            const oldText =
                copyPromo.innerHTML;

            copyPromo.innerHTML =
                `Copied!
                <i class="fa-solid fa-check"></i>`;


            setTimeout(() => {

                copyPromo.innerHTML =
                    oldText;

            }, 2000);

        } catch (error) {

            alert(
                "Promo Code: WELCOME20"
            );
        }

    });


    /* =========================================
       CART PROMO
    ========================================= */

    const applyPromo = $("#applyPromo");
    const promoInput = $("#promoInput");

    let promoApplied = false;


    on(applyPromo, "click", () => {

        const code =
            promoInput?.value
                .trim()
                .toUpperCase();


        if (code === "WELCOME20") {

            promoApplied = true;

            showToast(
                "20% discount applied!"
            );

        } else {

            promoApplied = false;

            showToast(
                "Invalid promo code"
            );
        }


        updateCart();

    });


    /* =========================================
       CHECKOUT
    ========================================= */

    const checkoutBtn = $("#checkoutBtn");
    const checkoutOverlay = $("#checkoutOverlay");
    const checkoutClose = $("#checkoutClose");


    function calculateOrder() {

        const subtotal =
            cart.reduce(
                (total, item) =>
                    total +
                    Number(item.price) *
                    Number(item.quantity),
                0
            );


        const discount =
            promoApplied && subtotal > 0
                ? Math.round(
                    subtotal * 0.20
                )
                : 0;


        const delivery =
            subtotal >= 2000
                ? 0
                : subtotal > 0
                    ? 150
                    : 0;


        const total =
            subtotal -
            discount +
            delivery;


        return {
            subtotal,
            discount,
            delivery,
            total
        };

    }


    /* =========================================
       RENDER CHECKOUT
    ========================================= */

    function renderCheckout() {

        const orderItems =
            $("#checkoutOrderItems");


        if (!orderItems) return;


        orderItems.innerHTML = "";


        cart.forEach(item => {

            const itemTotal =
                Number(item.price) *
                Number(item.quantity);


            const element =
                document.createElement("div");


            element.className =
                "checkout-product";


            element.innerHTML = `

                <div>

                    <div class="checkout-product-name">

                        ${escapeHTML(item.name)}

                    </div>

                    <div class="checkout-product-quantity">

                        ${item.quantity}
                        ×
                        Rs.
                        ${Number(
                            item.price
                        ).toLocaleString()}

                    </div>

                </div>


                <div class="checkout-product-price">

                    Rs.
                    ${itemTotal.toLocaleString()}

                </div>

            `;


            orderItems.appendChild(element);

        });


        const totals =
            calculateOrder();


        const subtotal =
            $("#checkoutSubtotal");

        const discount =
            $("#checkoutDiscount");

        const delivery =
            $("#checkoutDeliveryFee");

        const grandTotal =
            $("#checkoutGrandTotal");


        if (subtotal) {

            subtotal.textContent =
                "Rs. " +
                totals.subtotal.toLocaleString();
        }


        if (discount) {

            discount.textContent =
                "- Rs. " +
                totals.discount.toLocaleString();
        }


        if (delivery) {

            delivery.textContent =
                totals.delivery === 0
                    ? "FREE"
                    : "Rs. " +
                      totals.delivery.toLocaleString();
        }


        if (grandTotal) {

            grandTotal.textContent =
                "Rs. " +
                totals.total.toLocaleString();
        }

    }


    /* =========================================
       OPEN CHECKOUT
    ========================================= */

    function openCheckout() {

        if (cart.length === 0) {

            alert(
                "Your bag is empty. Please add food first."
            );

            return;
        }


        closeCartDrawer();

        renderCheckout();


        if (checkoutOverlay) {

            checkoutOverlay.classList.add("show");

            document.body.style.overflow =
                "hidden";
        }

    }


    /* =========================================
       CLOSE CHECKOUT
    ========================================= */

    function closeCheckout() {

        checkoutOverlay?.classList.remove(
            "show"
        );

        document.body.style.overflow = "";

    }


    on(checkoutBtn, "click", event => {

        event.preventDefault();

        openCheckout();

    });


    on(
        checkoutClose,
        "click",
        closeCheckout
    );


    on(
        checkoutOverlay,
        "click",
        event => {

            if (
                event.target === checkoutOverlay
            ) {

                closeCheckout();
            }

        }
    );




/* MOBILE WALLET TOGGLE */
const walletDetails = $("#walletDetails");
const walletCnicGroup = $("#walletCnicGroup");
const paymentRadios = document.querySelectorAll('input[name="payment"]');
const walletProviderRadios = document.querySelectorAll('input[name="walletProvider"]');

function refreshWalletUI() {
    const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
    if (walletDetails) {
        walletDetails.style.display = selectedPayment === "Mobile Wallet" ? "block" : "none";
    }
    const selectedProvider = document.querySelector('input[name="walletProvider"]:checked')?.value;
    if (walletCnicGroup) {
        walletCnicGroup.style.display = selectedProvider === "JazzCash" ? "block" : "none";
    }
}
paymentRadios.forEach(radio => on(radio, "change", refreshWalletUI));
walletProviderRadios.forEach(radio => on(radio, "change", refreshWalletUI));
refreshWalletUI();

/* CHARGE JAZZCASH / EASYPAISA */
async function chargeMobileWallet(provider, amount, mobileNumber, cnicLast6, orderNumber) {
    const endpoint = provider === "JazzCash" ? "/api/payment/jazzcash/charge" : "/api/payment/easypaisa/charge";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            amount: amount,
            mobile_number: mobileNumber,
            cnic_last6: cnicLast6 || "",
            order_number: orderNumber
        })
    });
    return await response.json();
}

    /* =========================================
       PLACE ORDER
       SAVE ORDER TO FLASK + SQLITE
    ========================================= */

    const checkoutForm =
        $("#checkoutForm");


    on(
        checkoutForm,
        "submit",
        async event => {

            event.preventDefault();


            if (cart.length === 0) {

                alert(
                    "Your bag is empty."
                );

                return;
            }


            /* CUSTOMER INFORMATION */

            const name =
                $("#customerName")
                    ?.value.trim();

            const phone =
                $("#customerPhone")
                    ?.value.trim();

            const email =
                $("#customerEmail")
                    ?.value.trim();

            const address =
                $("#customerAddress")
                    ?.value.trim();

            const city =
                $("#customerCity")
                    ?.value;

            const instructions =
                $("#deliveryInstructions")
                    ?.value.trim();


            /* PAYMENT */

            const payment =
                document.querySelector(
                    'input[name="payment"]:checked'
                )?.value ||
                "Cash on Delivery";


            /* VALIDATION */

            if (
                !name ||
                !phone ||
                !email ||
                !address ||
                !city
            ) {

                alert(
                    "Please complete all required information."
                );

                return;
            }


            /* CALCULATE TOTALS */

            const totals =
                calculateOrder();


            /* CREATE ORDER ID */

            const orderId =
                "SV-" +
                Math.floor(
                    100000 +
                    Math.random() * 900000
                );


            /* COMPLETE ORDER OBJECT */

            const order = {

                id: orderId,

                customer: {

                    name: name,

                    phone: phone,

                    email: email,

                    address: address,

                    city: city,

                    instructions:
                        instructions || ""

                },

                payment: payment,

                items: cart.map(item => ({

                    id: item.id || null,

                    name: item.name,

                    price: Number(item.price),

                    quantity: Number(item.quantity),

                    image: item.image || ""

                })),

                promo_code:
                    promoApplied
                        ? (promoInput?.value || "")
                            .trim()
                            .toUpperCase()
                        : "",

                totals: {

                    subtotal:
                        Number(totals.subtotal),

                    discount:
                        Number(totals.discount),

                    delivery:
                        Number(totals.delivery),

                    total:
                        Number(totals.total)

                },

                date:
                    new Date().toISOString()

            











            };

            order.payment_status = "Unpaid";
            order.transaction_id = "";

            if (payment === "Mobile Wallet") {

                const walletProvider =
                    document.querySelector('input[name="walletProvider"]:checked')?.value || "JazzCash";
                const walletMobileNumber = $("#walletMobileNumber")?.value.trim();
                const walletCnicLast6 = $("#walletCnicLast6")?.value.trim();

                if (!/^03\d{9}$/.test(walletMobileNumber || "")) {
                    alert(`Please enter a valid ${walletProvider} mobile number (03XXXXXXXXX).`);
                    return;
                }
                if (walletProvider === "JazzCash" && !/^\d{6}$/.test(walletCnicLast6 || "")) {
                    alert("Please enter the last 6 digits of your CNIC for JazzCash.");
                    return;
                }

                const confirmPay = confirm(`Confirm ${walletProvider} payment of Rs. ${totals.total} from ${walletMobileNumber}?`);
                if (!confirmPay) return;

                try {
                    const walletResult = await chargeMobileWallet(
                        walletProvider, totals.total, walletMobileNumber, walletCnicLast6, orderId
                    );
                    if (!walletResult.success) {
                        alert(walletResult.message || `${walletProvider} payment failed. Please try again.`);
                        return;
                    }
                    order.payment_status = "Paid";
                    order.transaction_id = walletResult.transaction_id;
                    order.payment = walletProvider;
                } catch (walletError) {
                    console.error("WALLET CHARGE ERROR:", walletError);
                    alert(`Could not reach ${walletProvider}. Please try again.`);
                    return;
                }
            }

            /* =====================================
               DISABLE BUTTON WHILE SAVING
            ===================================== */






                    
            const submitButton =
                checkoutForm.querySelector(
                    'button[type="submit"]'
                );


            const oldButtonText =
                submitButton
                    ? submitButton.innerHTML
                    : "";


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Placing Order...
                `;

            }


            try {

                /* =====================================
                   SEND ORDER TO FLASK
                ===================================== */


                



                const response =
                    await fetch(
                        "/api/orders",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(order)

                        }
                    );


                /* SERVER ERROR */

                if (!response.ok) {

                    throw new Error(
                        `Server error: ${response.status}`
                    );

                }


                const data =
                    await response.json();


                console.log(
                    "Order API response:",
                    data
                );


                /* =====================================
                   CHECK DATABASE RESPONSE
                ===================================== */

                if (!data.success) {

                    throw new Error(
                        data.message ||
                        "Order could not be saved."
                    );

                }


                /* =====================================
                   USE DATABASE ORDER ID
                ===================================== */

                const savedOrderId =
                    data.order_id ||
                    data.id ||
                    orderId;


                order.id =
                    savedOrderId;


                /* =====================================
                   SAVE LAST ORDER LOCALLY
                ===================================== */

                localStorage.setItem(
                    "savoraLastOrder",
                    JSON.stringify(order)
                );


                /* =====================================
                   SUCCESS SCREEN DATA
                ===================================== */

                const orderIdElement =
                    $("#orderId");


                const successAddress =
                    $("#successAddress");


                if (orderIdElement) {

                    orderIdElement.textContent =
                        savedOrderId;

                }


                if (successAddress) {

                    successAddress.textContent =
                        `${address}, ${city}`;

                }


                /* =====================================
                   CLOSE CHECKOUT
                ===================================== */

                closeCheckout();


                /* =====================================
                   SHOW SUCCESS
                ===================================== */

                const successOverlay =
                    $("#successOverlay");


                if (successOverlay) {

                    successOverlay.classList.add(
                        "show"
                    );

                    document.body.style.overflow =
                        "hidden";

                }


                /* =====================================
                   CLEAR CART
                ===================================== */

                cart = [];

                promoApplied = false;

                if (promoInput) {
                    promoInput.value = "";
                }

                saveCart();

                updateCart();


                console.log(
                    "Order successfully saved:",
                    savedOrderId
                );


            } catch (error) {

                console.error(
                    "ORDER SAVE ERROR:",
                    error
                );


                alert(
                    "Order could not be placed. Please make sure the Flask server is running and try again."
                );


            } finally {

                /* =====================================
                   ENABLE BUTTON AGAIN
                ===================================== */

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.innerHTML =
                        oldButtonText;

                }

            }

        }
    );


    /* =========================================
       TRACK THIS ORDER (prefill from last order)
    ========================================= */

    const trackThisOrder =
        $("#trackThisOrder");

    on(
        trackThisOrder,
        "click",
        (e) => {

            try {

                const lastOrder =
                    JSON.parse(
                        localStorage.getItem(
                            "savoraLastOrder"
                        ) || "null"
                    );

                if (
                    lastOrder &&
                    lastOrder.id &&
                    lastOrder.customer?.phone
                ) {

                    e.preventDefault();

                    const url =
                        "/track-order?order=" +
                        encodeURIComponent(lastOrder.id) +
                        "&phone=" +
                        encodeURIComponent(
                            lastOrder.customer.phone
                        );

                    window.location.href = url;

                }

            } catch (err) {

                // Fall back to plain link
                // if localStorage data is malformed.

            }

        }
    );


    /* =========================================
       CONTINUE SHOPPING
    ========================================= */

    const continueShopping =
        $("#continueShopping");


    on(
        continueShopping,
        "click",
        () => {

            $("#successOverlay")
                ?.classList.remove(
                    "show"
                );


            document.body.style.overflow =
                "";


            document
                .querySelector("#menu")
                ?.scrollIntoView({
                    behavior: "smooth"
                });

        }
    );


    /* =========================================
       NEWSLETTER
    ========================================= */

    const newsletterForm =
        $("#newsletterForm");


    on(
        newsletterForm,
        "submit",
        event => {

            event.preventDefault();


            const input =
                newsletterForm.querySelector(
                    "input"
                );


            const email =
                input?.value.trim();


            if (!email) {

                alert(
                    "Please enter your email address."
                );

                return;
            }


            alert(
                "Thank you! You are now subscribed to Savora."
            );


            newsletterForm.reset();

        }
    );


    /* =========================================
       TOAST
    ========================================= */

    function showToast(message) {

        const toast =
            $("#toast");

        const toastMessage =
            $("#toastMessage");


        if (!toast) return;


        if (toastMessage) {

            toastMessage.textContent =
                message;

        }


        toast.classList.add("show");


        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);

    }


    /* =========================================
       NAVBAR SHADOW
    ========================================= */

    const navbar =
        $(".navbar");


    window.addEventListener(
        "scroll",
        () => {

            if (!navbar) return;


            if (window.scrollY > 30) {

                navbar.style.boxShadow =
                    "0 5px 25px rgba(0,0,0,.08)";

            } else {

                navbar.style.boxShadow =
                    "none";
            }

        }
    );


    /* =========================================
       ESC KEY
    ========================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }


            searchModal?.classList.remove(
                "show"
            );


            closeCartDrawer();

            closeCheckout();


            $("#successOverlay")
                ?.classList.remove(
                    "show"
                );


            document.body.style.overflow =
                "";

        }
    );


    /* =========================================
       ESCAPE HTML
    ========================================= */

    function escapeHTML(value) {

        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    function escapeAttribute(value) {

        return escapeHTML(value);

    }


    /* =========================================
       INITIALIZE
    ========================================= */

    
        updateCart();

    loadProducts();


    /* =========================================
       SCROLL REVEAL ANIMATIONS
    ========================================= */

    function initScrollReveal() {

        const revealTargets =
            $$("[data-reveal]");

        if (!revealTargets.length) {
            return;
        }

        if (!("IntersectionObserver" in window)) {

            revealTargets.forEach(target =>
                target.classList.add("in-view")
            );

            return;
        }

        const observer = new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "in-view"
                        );

                        observer.unobserve(
                            entry.target
                        );
                    }
                });
            },
            {
                threshold: 0.15,
                rootMargin: "0px 0px -60px 0px"
            }
        );

        revealTargets.forEach(target =>
            observer.observe(target)
        );
    }

    initScrollReveal();

    /* Re-run reveal check for the menu grid after products load,
       since it's populated asynchronously after initial page load. */

    const menuRevealTarget =
        document.querySelector('[data-reveal="stagger"]#menu, #menu[data-reveal]');

    if (menuRevealTarget) {

        setTimeout(() => {
            menuRevealTarget.classList.add("in-view");
        }, 300);
    }


    console.log(
        "Savora Phase 4 JavaScript loaded successfully."
    );

});