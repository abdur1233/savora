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
    let fullMenuVisibleCount = 6;

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

        const isFullMenuLayout =
            menuContainer.dataset.layout === "full-menu";

        let listToRender = productList;

        if (isFullMenuLayout) {

            listToRender =
                productList.slice(0, fullMenuVisibleCount);

        }

        menuContainer.innerHTML = "";

        listToRender.forEach(product => {

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

            const stockBadgeHTML = isOutOfStock
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
                );

            if (isFullMenuLayout) {

                card.innerHTML = `

                    <div class="food-image">

                        <img
                            src="${escapeAttribute(image)}"
                            alt="${escapeAttribute(product.name)}"
                            loading="lazy"
                        >

                        <div class="food-image-overlay">
                            <span>
                                <i class="fa-solid fa-eye"></i>
                                View Details
                            </span>
                        </div>

                        <button
                            type="button"
                            class="favorite heart-btn"
                            aria-label="Add to favorites">

                            <i class="fa-regular fa-heart"></i>

                        </button>

                        ${stockBadgeHTML}

                    </div>


                    <div class="food-content">

                        <span class="food-category">
                            ${escapeHTML(product.category || "")}
                        </span>

                        <h3>
                            ${escapeHTML(product.name || "")}
                        </h3>

                        <div class="food-rating">

                            <span class="stars">
                                ${stars}
                            </span>

                            <span>
                                ${rating.toFixed(1)}
                            </span>

                        </div>


                        <div class="food-bottom menu-card-bottom">

                            <strong>
                                Rs. ${Number(
                                    product.price || 0
                                ).toLocaleString()}
                            </strong>


                            <div class="menu-card-actions">

                                <div class="qty-stepper">

                                    <button
                                        type="button"
                                        class="qty-minus"
                                        aria-label="Decrease quantity">
                                        −
                                    </button>

                                    <span class="qty-value">1</span>

                                    <button
                                        type="button"
                                        class="qty-plus"
                                        aria-label="Increase quantity">
                                        +
                                    </button>

                                </div>


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
                                    data-customize="${
                                        productHasCustomizations(product)
                                            ? "true"
                                            : "false"
                                    }"
                                    ${isOutOfStock ? "disabled" : ""}
                                    style="${
                                        isOutOfStock
                                            ? "opacity:0.5; cursor:not-allowed;"
                                            : ""
                                    }"
                                    aria-label="Add to cart">

                                    <i class="fa-solid fa-plus"></i>

                                </button>

                            </div>

                        </div>

                    </div>

                `;

            } else {

                card.innerHTML = `

                    <div class="food-image">

                        <img
                            src="${escapeAttribute(image)}"
                            alt="${escapeAttribute(product.name)}"
                            loading="lazy"
                        >

                        <div class="food-image-overlay">
                            <span>
                                <i class="fa-solid fa-eye"></i>
                                View Details
                            </span>
                        </div>

                        <button
                            type="button"
                            class="favorite heart-btn"
                            aria-label="Add to favorites">

                            <i class="fa-regular fa-heart"></i>

                        </button>

                        ${stockBadgeHTML}

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
                                data-customize="${
                                    productHasCustomizations(product)
                                        ? "true"
                                        : "false"
                                }"
                                ${isOutOfStock ? "disabled" : ""}
                                style="${
                                    isOutOfStock
                                        ? "opacity:0.5; cursor:not-allowed;"
                                        : ""
                                }">

                                <i class="fa-solid fa-plus"></i>
                                ${
                                    isOutOfStock
                                        ? "Out of Stock"
                                        : (
                                            productHasCustomizations(product)
                                                ? "Customize"
                                                : "Add"
                                        )
                                }

                            </button>

                        </div>

                    </div>

                `;

            }

            menuContainer.appendChild(card);

        });

        if (isFullMenuLayout) {

            const loadMoreBtn =
                document.querySelector("#loadMoreBtn");

            if (loadMoreBtn) {

                loadMoreBtn.style.display =
                    fullMenuVisibleCount >= productList.length
                        ? "none"
                        : "";

            }

        }

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

                if (button.dataset.customize === "true") {

                    const fullProduct =
                        products.find(
                            p => String(p.id) === String(id)
                        );

                    if (fullProduct) {
                        openCustomizeModal(fullProduct);
                        return;
                    }

                }

                // If this card has a quantity stepper next
                // to the Add button (the full-menu layout),
                // add that many at once and reset it back
                // to 1 afterwards.

                const qtyEl =
                    button
                        .closest(".menu-card-actions")
                        ?.querySelector(".qty-value");

                const quantity =
                    qtyEl
                        ? Math.max(1, parseInt(qtyEl.textContent, 10) || 1)
                        : 1;

                addToCart(
                    id,
                    name,
                    price,
                    image,
                    { quantity }
                );

                if (qtyEl) {
                    qtyEl.textContent = "1";
                }

            });

        });


        /* QUANTITY STEPPER (full-menu layout) */

        $$(".qty-minus").forEach(button => {

            on(button, "click", event => {

                event.preventDefault();

                const valueEl =
                    button
                        .closest(".qty-stepper")
                        ?.querySelector(".qty-value");

                if (!valueEl) return;

                const current =
                    parseInt(valueEl.textContent, 10) || 1;

                valueEl.textContent =
                    Math.max(1, current - 1);

            });

        });


        $$(".qty-plus").forEach(button => {

            on(button, "click", event => {

                event.preventDefault();

                const valueEl =
                    button
                        .closest(".qty-stepper")
                        ?.querySelector(".qty-value");

                if (!valueEl) return;

                const current =
                    parseInt(valueEl.textContent, 10) || 1;

                valueEl.textContent =
                    Math.min(99, current + 1);

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

                    ${
                        item.customizationSummary
                            ? `
                                <p class="cart-item-customizations">
                                    ${escapeHTML(
                                        item.customizationSummary
                                    )}
                                </p>
                            `
                            : ""
                    }

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
        image = "",
        options = {}
    ) {

        const selectedSize = options.selectedSize || "";
        const selectedAddons = options.selectedAddons || [];
        const selectedSpice = options.selectedSpice || "";
        const customizationSummary =
            options.customizationSummary || "";

        const quantityToAdd =
            Math.max(1, Number(options.quantity) || 1);

        // Items with different customizations must stay as
        // separate cart lines, so we match on name + the
        // exact selections, not just the name.

        const optionKey = JSON.stringify({
            selectedSize,
            selectedAddons: [...selectedAddons].sort(),
            selectedSpice
        });

        const existing =
            cart.find(
                item =>
                    item.name === name &&
                    (item.optionKey || "{}") === optionKey
            );


        if (existing) {

            existing.quantity += quantityToAdd;

        } else {

            cart.push({

                id: id,
                name: name,
                price: Number(price),
                quantity: quantityToAdd,
                image: image,
                optionKey: optionKey,
                selectedSize: selectedSize,
                selectedAddons: selectedAddons,
                selectedSpice: selectedSpice,
                customizationSummary: customizationSummary

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


            // On the full-menu (paginated) layout, only a
            // handful of products exist in the DOM at once.
            // Filtering by a specific category should show
            // every matching item, not just the ones loaded
            // so far — so expand pagination first, then
            // re-render before applying the show/hide filter.

            const fullMenuGrid =
                document.querySelector(
                    '.food-grid[data-layout="full-menu"]'
                );

            if (fullMenuGrid && products.length) {

                fullMenuVisibleCount =
                    category === "all"
                        ? 6
                        : products.length;

                renderProducts(products);

            }


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
       LOAD MORE (full-menu layout)
    ========================================= */

    const loadMoreBtn = $("#loadMoreBtn");

    on(loadMoreBtn, "click", () => {

        fullMenuVisibleCount += 6;

        renderProducts(products);

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

                    ${
                        item.customizationSummary
                            ? `
                                <div class="checkout-product-customizations">
                                    ${escapeHTML(
                                        item.customizationSummary
                                    )}
                                </div>
                            `
                            : ""
                    }

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

        if (!checkoutOverlay) {

            // Checkout modal only lives on the homepage.
            // Cart is shared via localStorage, so just send
            // the customer there and auto-open checkout.

            window.location.href = "/?checkout=1";
            return;

        }

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

                    image: item.image || "",

                    selected_size: item.selectedSize || "",

                    selected_addons: item.selectedAddons || [],

                    selected_spice: item.selectedSpice || ""

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


    /* =====================================================
       ITEM CUSTOMIZATION (sizes / add-ons / spice levels)
    ===================================================== */

    function parseProductCustomizations(product) {

        try {

            const raw = product && product.customizations;

            if (!raw) return {};

            const parsed =
                typeof raw === "string"
                    ? JSON.parse(raw)
                    : raw;

            return parsed && typeof parsed === "object"
                ? parsed
                : {};

        } catch (error) {

            return {};

        }

    }

    function productHasCustomizations(product) {

        const config = parseProductCustomizations(product);

        return Boolean(
            (config.sizes && config.sizes.length) ||
            (config.addons && config.addons.length) ||
            (config.spice_levels && config.spice_levels.length)
        );

    }

    function openCustomizeModal(product) {

        const config = parseProductCustomizations(product);

        const sizes = config.sizes || [];
        const addons = config.addons || [];
        const spiceLevels = config.spice_levels || [];

        const basePrice = Number(product.price || 0);

        const overlay = document.createElement("div");
        overlay.className = "customize-overlay";

        overlay.innerHTML = `
            <div class="customize-modal">

                <div class="customize-header">
                    <h3>${escapeHTML(product.name || "")}</h3>
                    <button
                        type="button"
                        class="customize-close"
                        aria-label="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="customize-body">

                    ${
                        sizes.length
                            ? `
                            <div class="customize-section">
                                <label class="customize-section-title">
                                    Choose Size
                                </label>
                                ${sizes.map((size, index) => `
                                    <label class="customize-option">
                                        <span>
                                            <input
                                                type="radio"
                                                name="customizeSize"
                                                value="${escapeAttribute(size.name)}"
                                                data-price="${Number(size.price) || 0}"
                                                ${index === 0 ? "checked" : ""}>
                                            ${escapeHTML(size.name)}
                                        </span>
                                        <span>
                                            Rs. ${Number(size.price || 0).toLocaleString()}
                                        </span>
                                    </label>
                                `).join("")}
                            </div>
                            `
                            : ""
                    }

                    ${
                        addons.length
                            ? `
                            <div class="customize-section">
                                <label class="customize-section-title">
                                    Add-ons
                                </label>
                                ${addons.map(addon => `
                                    <label class="customize-option">
                                        <span>
                                            <input
                                                type="checkbox"
                                                name="customizeAddon"
                                                value="${escapeAttribute(addon.name)}"
                                                data-price="${Number(addon.price) || 0}">
                                            ${escapeHTML(addon.name)}
                                        </span>
                                        <span>
                                            ${
                                                Number(addon.price) > 0
                                                    ? "+ Rs. " + Number(addon.price).toLocaleString()
                                                    : "Free"
                                            }
                                        </span>
                                    </label>
                                `).join("")}
                            </div>
                            `
                            : ""
                    }

                    ${
                        spiceLevels.length
                            ? `
                            <div class="customize-section">
                                <label class="customize-section-title">
                                    Spice Level
                                </label>
                                ${spiceLevels.map((level, index) => `
                                    <label class="customize-option">
                                        <span>
                                            <input
                                                type="radio"
                                                name="customizeSpice"
                                                value="${escapeAttribute(level)}"
                                                ${index === 0 ? "checked" : ""}>
                                            ${escapeHTML(level)}
                                        </span>
                                    </label>
                                `).join("")}
                            </div>
                            `
                            : ""
                    }

                </div>

                <div class="customize-footer">
                    <div class="customize-total">
                        Total: <strong class="customize-total-price">
                            Rs. ${basePrice.toLocaleString()}
                        </strong>
                    </div>
                    <button
                        type="button"
                        class="btn-primary customize-add-btn">
                        Add to Cart
                    </button>
                </div>

            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";

        const totalPriceEl =
            overlay.querySelector(".customize-total-price");

        function recalcTotal() {

            const selectedSizeInput =
                overlay.querySelector(
                    "input[name='customizeSize']:checked"
                );

            let price = selectedSizeInput
                ? Number(selectedSizeInput.dataset.price) || 0
                : basePrice;

            overlay
                .querySelectorAll(
                    "input[name='customizeAddon']:checked"
                )
                .forEach(input => {
                    price += Number(input.dataset.price) || 0;
                });

            totalPriceEl.textContent =
                "Rs. " + price.toLocaleString();

            return price;

        }

        overlay.addEventListener("change", recalcTotal);

        function closeModal() {
            document.body.removeChild(overlay);
            document.body.style.overflow = "";
        }

        overlay
            .querySelector(".customize-close")
            .addEventListener("click", closeModal);

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) closeModal();
        });

        overlay
            .querySelector(".customize-add-btn")
            .addEventListener("click", () => {

                const finalPrice = recalcTotal();

                const selectedSizeInput =
                    overlay.querySelector(
                        "input[name='customizeSize']:checked"
                    );

                const selectedSpiceInput =
                    overlay.querySelector(
                        "input[name='customizeSpice']:checked"
                    );

                const selectedAddonInputs =
                    Array.from(
                        overlay.querySelectorAll(
                            "input[name='customizeAddon']:checked"
                        )
                    );

                const selections = {
                    selectedSize: selectedSizeInput
                        ? selectedSizeInput.value
                        : "",
                    selectedAddons: selectedAddonInputs.map(
                        input => input.value
                    ),
                    selectedSpice: selectedSpiceInput
                        ? selectedSpiceInput.value
                        : ""
                };

                const summaryParts = [];

                if (selections.selectedSize) {
                    summaryParts.push(
                        "Size: " + selections.selectedSize
                    );
                }

                if (selections.selectedAddons.length) {
                    summaryParts.push(
                        "Add-ons: " +
                        selections.selectedAddons.join(", ")
                    );
                }

                if (selections.selectedSpice) {
                    summaryParts.push(
                        "Spice: " + selections.selectedSpice
                    );
                }

                addToCart(
                    product.id,
                    product.name,
                    finalPrice,
                    product.image,
                    {
                        ...selections,
                        customizationSummary:
                            summaryParts.join(" | ")
                    }
                );

                closeModal();

            });

    }


    /* =====================================================
       OFFER COUNTDOWN
       (counts down to midnight — a genuine "today only"
        deadline that refreshes naturally each day)
    ===================================================== */

    function startOfferCountdown() {

        const hoursEl = $("#countdownHours");
        const minutesEl = $("#countdownMinutes");
        const secondsEl = $("#countdownSeconds");

        if (!hoursEl || !minutesEl || !secondsEl) return;

        function pad(number) {
            return String(number).padStart(2, "0");
        }

        function tick() {

            const now = new Date();

            const midnight = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1,
                0, 0, 0
            );

            const diff =
                Math.max(0, midnight - now);

            const hours =
                Math.floor(diff / 3600000);

            const minutes =
                Math.floor((diff % 3600000) / 60000);

            const seconds =
                Math.floor((diff % 60000) / 1000);

            hoursEl.textContent = pad(hours);
            minutesEl.textContent = pad(minutes);
            secondsEl.textContent = pad(seconds);

        }

        tick();

        setInterval(tick, 1000);

    }

    startOfferCountdown();


    /* =========================================
       INITIALIZE
    ========================================= */

    
        updateCart();

    loadProducts();


    /* =====================================================
       AUTO-OPEN CHECKOUT
       (customer clicked "Proceed to Checkout" on the
        /menu page and got sent here with ?checkout=1)
    ===================================================== */

    if (
        new URLSearchParams(window.location.search)
            .get("checkout") === "1"
    ) {

        // Clean the URL so refreshing doesn't reopen it.

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

        setTimeout(openCheckout, 150);

    }


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


    /* =====================================================
       GSAP ENHANCEMENTS
       (purely visual — only runs if GSAP loaded from CDN.
        The IntersectionObserver reveal system above keeps
        working exactly as before either way, so nothing
        breaks if GSAP ever fails to load.)
    ===================================================== */

    function initGsapEnhancements() {

        if (typeof gsap === "undefined") return;

        if (typeof ScrollTrigger !== "undefined") {
            gsap.registerPlugin(ScrollTrigger);
        }

        /* ---- 1. HERO ENTRANCE ANIMATION ---- */

        const heroHeading = document.querySelector(".hero h1");

        if (heroHeading) {

            const heroTimeline = gsap.timeline({
                defaults: {
                    ease: "power3.out",
                    duration: 0.8,
                    clearProps: "all"
                }
            });

            heroTimeline
                .from(".eyebrow", { opacity: 0, y: 20 })
                .from(".hero h1", { opacity: 0, y: 30 }, "-=0.55")
                .from(".hero-description", { opacity: 0, y: 20 }, "-=0.55")
                .from(
                    ".hero-actions .btn",
                    { opacity: 0, y: 20, stagger: 0.15 },
                    "-=0.45"
                )
                .from(".trust-row", { opacity: 0, y: 20 }, "-=0.35")
                .from(
                    ".hero-image-wrap",
                    { opacity: 0, scale: 0.85, duration: 1 },
                    "-=0.9"
                )
                .from(
                    ".floating-card",
                    { opacity: 0, scale: 0.5, stagger: 0.15 },
                    "-=0.5"
                )
                .from(".hero-price", { opacity: 0, scale: 0.5 }, "-=0.35");

        }


        /* ---- 2. RATING NUMBER COUNT-UP ---- */

        const ratingEl = document.querySelector(".trust-row strong");

        if (ratingEl) {

            const counter = { value: 0 };

            gsap.to(counter, {
                value: 4.9,
                duration: 1.5,
                delay: 0.7,
                ease: "power2.out",
                onUpdate: () => {
                    ratingEl.textContent =
                        counter.value.toFixed(1) + "/5";
                }
            });

        }


    }

    initGsapEnhancements();


    console.log(
        "Savora Phase 4 JavaScript loaded successfully."
    );

});