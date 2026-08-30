# =========================================================
# SAVORA FOOD WEBSITE
# FLASK + SQLITE BACKEND
# COMPLETE CORRECTED VERSION
# =========================================================




print(
    "###### YE WALI APP.PY FILE RUN HO RAHI HAI ######",
    flush=True
)

# =========================================================
# IMPORTS
# =========================================================


from flask import (
    Flask,
    render_template,
    jsonify,
    request,
    session,
    redirect,
    url_for,
    Response,
    stream_with_context
)





from flask_mail import Mail, Message
from werkzeug.security import check_password_hash
from functools import wraps

import os
from dotenv import load_dotenv

import sqlite3
import re
import hashlib
import hmac
import uuid
import secrets
import queue
import threading
import json as json_module
import requests
import os

from pathlib import Path
from datetime import datetime, timedelta


# =========================================================
# APP CONFIGURATION
# =========================================================
load_dotenv()
app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv(
    "SAVORA_SECRET_KEY"
) or secrets.token_hex(32)

DATABASE = Path(__file__).parent / "savora.db"


# =========================================================
# VALIDATION HELPERS
# =========================================================

EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)

PHONE_REGEX = re.compile(
    r"^03\d{9}$"
)


def is_valid_email(email):
    return bool(
        EMAIL_REGEX.match(
            email.strip()
        )
    )


def is_valid_phone(phone):
    return bool(
        PHONE_REGEX.match(
            phone.strip()
        )
    )


def env_or(key, default=""):
    """
    Like os.getenv, but treats an empty/blank value in .env
    the same as the key not being set at all, so leaving a
    field blank in .env falls back to the default instead of
    becoming an empty string.
    """
    value = os.getenv(key)
    if value is None or value.strip() == "":
        return default
    return value


# =========================================================
# LIVE ADMIN DASHBOARD (Server-Sent Events)
#
# Whenever a customer places an order (or its status
# changes), every open admin dashboard tab gets pushed a
# message instantly — no manual refresh needed. Each
# connected admin browser tab registers its own queue;
# broadcast_event() drops a message into every registered
# queue.
# =========================================================

sse_subscribers = []
sse_lock = threading.Lock()


def broadcast_event(event_type, data):

    message = json_module.dumps({
        "type": event_type,
        "data": data
    })

    with sse_lock:

        dead_queues = []

        for q in sse_subscribers:

            try:
                q.put_nowait(message)
            except queue.Full:
                dead_queues.append(q)

        for q in dead_queues:
            sse_subscribers.remove(q)


# =========================================================
# PAYMENT GATEWAY CONFIGURATION
# JAZZCASH / EASYPAISA
# =========================================================

PAYMENT_TEST_MODE = os.getenv(
    "SAVORA_PAYMENT_TEST_MODE",
    "true"
).strip().lower() != "false"


# =========================================================
# COUPON CODES (server-side only — never trust client discount)
# =========================================================

COUPON_CODES = {
    "WELCOME20": 0.20
}


JAZZCASH_CONFIG = {
    "merchant_id": env_or(
        "JAZZCASH_MERCHANT_ID", "MC00000"
    ),
    "password": env_or(
        "JAZZCASH_PASSWORD", "xxxxxxxx"
    ),
    "integrity_salt": env_or(
        "JAZZCASH_INTEGRITY_SALT", "xxxxxxxxxx"
    ),

    "api_url": env_or(
        "JAZZCASH_API_URL",
        "https://sandbox.jazzcash.com.pk/"
        "ApplicationAPI/API/2.0/Purchase/"
        "DoMWalletTransaction"
    ),

    "return_url": env_or(
        "JAZZCASH_RETURN_URL",
        "http://localhost:5000/"
        "api/payment/jazzcash/callback"
    )
}


EASYPAISA_CONFIG = {
    "store_id": env_or(
        "EASYPAISA_STORE_ID", "000000"
    ),
    "hashkey": env_or(
        "EASYPAISA_HASHKEY", "xxxxxxxxxx"
    ),

    "api_url": env_or(
        "EASYPAISA_API_URL",
        "https://easypaystg.easypaisa.com.pk/"
        "easypay-service/rest/v4/"
        "initiate-ma-transaction"
    ),

    "username": env_or(
        "EASYPAISA_USERNAME", "xxxxxxxxxx"
    ),
    "password": env_or(
        "EASYPAISA_PASSWORD", "xxxxxxxx"
    )
}


# =========================================================
# ADMIN LOGIN CONFIGURATION
# =========================================================

ADMIN_USERNAME = env_or(
    "SAVORA_ADMIN_USERNAME",
    "Savora@2026"
)

ADMIN_PASSWORD_HASH = env_or(
    "SAVORA_ADMIN_PASSWORD_HASH"
) or (
    "scrypt:32768:8:1$"
    "fQlNGsMXEPwpoCZ4$"
    "8036b776c427a6ceb88bf5722d45376aec6611ccd26fac83788a64e0de1ac939167fe575ac63917f034fb851a45e310875af676b905c2dba9c2f2048d89922f8"
)


# =========================================================
# ADMIN LOGIN DECORATOR
# =========================================================

def login_required(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):

        if not session.get("admin_logged_in"):
            return redirect(
                url_for("admin_login")
            )

        return f(*args, **kwargs)

    return decorated_function


# =========================================================
# EMAIL CONFIGURATION
# =========================================================

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True

# Apna Gmail yahan likhein
app.config["MAIL_USERNAME"] = os.getenv(
    "SAVORA_MAIL_USERNAME",
    "abdurrehmanabdurrehman901@gmail.com"
)

# Apna NEW Gmail App Password environment variable
# mein rakhna recommended hai.
app.config["MAIL_PASSWORD"] = os.getenv(
    "SAVORA_MAIL_PASSWORD",
    ""
)

app.config["MAIL_DEFAULT_SENDER"] = (
    "Savora",
    app.config["MAIL_USERNAME"]
)

mail = Mail(app)


# =========================================================
# WHATSAPP NOTIFICATIONS (via Twilio WhatsApp API)
# =========================================================

TWILIO_CONFIG = {
    "account_sid": env_or(
        "TWILIO_ACCOUNT_SID", ""
    ),
    "auth_token": env_or(
        "TWILIO_AUTH_TOKEN", ""
    ),
    "whatsapp_from": env_or(
        # Twilio's shared sandbox number — works for
        # free testing once a customer has joined the
        # sandbox. Replace with your own approved
        # WhatsApp Business number for production.
        "TWILIO_WHATSAPP_FROM",
        "whatsapp:+14155238886"
    )
}


# =========================================================
# APPROVED WHATSAPP TEMPLATES (production)
#
# Leave any of these blank and that message type will use
# plain free-form text instead (fine for the Twilio
# sandbox / testing). Once Meta approves your templates,
# paste each Content SID here — no other code change is
# needed, the switch happens automatically.
#
# Suggested template text to submit for approval (submit
# each as a separate template so the variable numbers
# below line up):
#
#   order_confirmation:
#     "Hi {{1}}! Your Savora order {{2}} has been placed
#      successfully. Total: Rs. {{3}}. Payment: {{4}}.
#      Track anytime: {{5}}"
#
#   order_status_confirmed:
#     "Hi {{1}}, your order {{2}} has been confirmed by
#      the restaurant."
#
#   order_status_preparing:
#     "Hi {{1}}, good news — our kitchen has started
#      preparing your order {{2}}."
#
#   order_status_out_for_delivery:
#     "Hi {{1}}, your order {{2}} is on its way! It
#      should reach you shortly."
#
#   order_status_delivered:
#     "Hi {{1}}, your order {{2}} has been delivered.
#      Enjoy your meal! Thank you for ordering with
#      Savora."
#
#   order_status_cancelled:
#     "Hi {{1}}, your order {{2}} has been cancelled. If
#      this wasn't expected, please contact us."
# =========================================================

WHATSAPP_TEMPLATES = {
    "order_confirmation": env_or(
        "TWILIO_TEMPLATE_ORDER_CONFIRMATION", ""
    ),
    "Confirmed": env_or(
        "TWILIO_TEMPLATE_STATUS_CONFIRMED", ""
    ),
    "Preparing": env_or(
        "TWILIO_TEMPLATE_STATUS_PREPARING", ""
    ),
    "Out for Delivery": env_or(
        "TWILIO_TEMPLATE_STATUS_OUT_FOR_DELIVERY", ""
    ),
    "Delivered": env_or(
        "TWILIO_TEMPLATE_STATUS_DELIVERED", ""
    ),
    "Cancelled": env_or(
        "TWILIO_TEMPLATE_STATUS_CANCELLED", ""
    )
}


def format_pk_whatsapp_number(phone):
    """
    Converts a local Pakistani number like '03001234567'
    into the international WhatsApp format
    'whatsapp:+923001234567'. Returns None if the number
    doesn't look valid.
    """

    digits = re.sub(r"\D", "", str(phone or ""))

    if len(digits) == 11 and digits.startswith("03"):
        return "whatsapp:+92" + digits[1:]

    if len(digits) == 12 and digits.startswith("923"):
        return "whatsapp:+" + digits

    return None


def send_whatsapp_message(
    phone,
    message=None,
    template_sid=None,
    template_variables=None
):
    """
    Sends a WhatsApp message via the Twilio WhatsApp API.

    Two modes:
      - template_sid set  -> sends an approved WhatsApp
        template (required for business-initiated
        production messages outside a 24h session window).
      - template_sid empty -> sends free-form text (only
        works in the Twilio sandbox, or when replying to a
        customer within 24h of their last message).

    Never raises — a WhatsApp failure should never block
    an order from completing, same as email.
    """

    if (
        not TWILIO_CONFIG["account_sid"]
        or not TWILIO_CONFIG["auth_token"]
    ):

        print(
            "WHATSAPP SKIPPED: Twilio credentials "
            "are not configured.",
            flush=True
        )

        return

    to_number = format_pk_whatsapp_number(phone)

    if not to_number:

        print(
            "WHATSAPP SKIPPED: invalid phone "
            f"number ({phone}).",
            flush=True
        )

        return

    try:

        url = (
            "https://api.twilio.com/2010-04-01/"
            f"Accounts/{TWILIO_CONFIG['account_sid']}/"
            "Messages.json"
        )

        payload = {
            "From": TWILIO_CONFIG["whatsapp_from"],
            "To": to_number
        }

        if template_sid:

            payload["ContentSid"] = template_sid

            payload["ContentVariables"] = (
                json_module.dumps(
                    template_variables or {}
                )
            )

        else:

            payload["Body"] = message or ""

        response = requests.post(
            url,
            data=payload,
            auth=(
                TWILIO_CONFIG["account_sid"],
                TWILIO_CONFIG["auth_token"]
            ),
            timeout=10
        )

        if response.status_code >= 400:

            print(
                "WHATSAPP SEND ERROR:",
                response.status_code,
                response.text[:300],
                flush=True
            )

        else:

            print(
                f"WhatsApp message sent to {to_number} "
                f"({'template' if template_sid else 'free-form'})",
                flush=True
            )

    except Exception as error:

        print(
            "WHATSAPP SEND ERROR:",
            str(error),
            flush=True
        )


def send_whatsapp_order_confirmation(
    customer_name,
    phone,
    order_number,
    total,
    payment_method
):

    track_url = (
        f"{env_or('SAVORA_SITE_URL', 'http://127.0.0.1:5000')}"
        f"/track-order?order={order_number}"
    )

    template_sid = WHATSAPP_TEMPLATES.get(
        "order_confirmation"
    )

    if template_sid:

        send_whatsapp_message(
            phone,
            template_sid=template_sid,
            template_variables={
                "1": customer_name,
                "2": order_number,
                "3": f"{total:,.0f}",
                "4": payment_method,
                "5": track_url
            }
        )

        return

    # Fallback: free-form text (sandbox / testing only)

    message = (
        f"Hi {customer_name}! 👋\n\n"
        f"Your Savora order *{order_number}* "
        f"has been placed successfully. ✅\n\n"
        f"Total: Rs. {total:,.0f}\n"
        f"Payment: {payment_method}\n\n"
        f"We'll message you again as your order "
        f"moves through Preparing → Out for Delivery "
        f"→ Delivered.\n\n"
        f"Track anytime: {track_url}"
    )

    send_whatsapp_message(phone, message=message)


def send_whatsapp_status_update(
    customer_name,
    phone,
    order_number,
    status
):

    status_messages = {
        "Confirmed":
            "Your order has been confirmed by the "
            "restaurant. 🎉",
        "Preparing":
            "Good news — our kitchen has started "
            "preparing your order. 👨‍🍳",
        "Out for Delivery":
            "Your order is on its way! 🛵 It should "
            "reach you shortly.",
        "Delivered":
            "Your order has been delivered. Enjoy your "
            "meal! 😋 Thank you for ordering with Savora.",
        "Cancelled":
            "Your order has been cancelled. If this "
            "wasn't expected, please contact us."
    }

    body = status_messages.get(status)

    if not body:
        return

    template_sid = WHATSAPP_TEMPLATES.get(status)

    if template_sid:

        send_whatsapp_message(
            phone,
            template_sid=template_sid,
            template_variables={
                "1": customer_name,
                "2": order_number
            }
        )

        return

    # Fallback: free-form text (sandbox / testing only)

    message = (
        f"Hi {customer_name}, update on your order "
        f"*{order_number}*:\n\n{body}"
    )

    send_whatsapp_message(phone, message=message)


# =========================================================
# JAZZCASH MOBILE ACCOUNT PAYMENT
# =========================================================

def jazzcash_generate_hash(
    params,
    integrity_salt
):

    sorted_keys = sorted(
        params.keys()
    )

    value_string = "&".join(
        str(params[k])
        for k in sorted_keys
        if params[k] != ""
    )

    hash_string = (
        f"{integrity_salt}&{value_string}"
    )

    return hmac.new(
        integrity_salt.encode("utf-8"),
        hash_string.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def jazzcash_charge(
    amount_pkr,
    mobile_number,
    cnic_last6,
    order_number
):

    # TEST MODE
    if PAYMENT_TEST_MODE:

        return {
            "success": True,
            "transaction_id": (
                f"TEST-JC-"
                f"{uuid.uuid4().hex[:10].upper()}"
            ),
            "message": (
                "Test mode: JazzCash payment "
                "simulated as successful."
            )
        }

    cfg = JAZZCASH_CONFIG

    now = datetime.now()

    expiry = (
        now + timedelta(hours=1)
    )

    amount_paisa = str(
        int(
            round(
                float(amount_pkr) * 100
            )
        )
    )

    params = {

        "pp_Version": "1.1",

        "pp_TxnType": "MWALLET",

        "pp_Language": "EN",

        "pp_MerchantID":
            cfg["merchant_id"],

        "pp_Password":
            cfg["password"],

        "pp_TxnRefNo":
            order_number,

        "pp_Amount":
            amount_paisa,

        "pp_TxnCurrency":
            "PKR",

        "pp_TxnDateTime":
            now.strftime(
                "%Y%m%d%H%M%S"
            ),

        "pp_BillReference":
            order_number,

        "pp_Description":
            f"Savora Order {order_number}",

        "pp_TxnExpiryDateTime":
            expiry.strftime(
                "%Y%m%d%H%M%S"
            ),

        "pp_MobileNumber":
            mobile_number,

        "pp_CNIC":
            cnic_last6
    }

    params["pp_SecureHash"] = (
        jazzcash_generate_hash(
            params,
            cfg["integrity_salt"]
        )
    )

    try:

        response = requests.post(
            cfg["api_url"],
            json=params,
            timeout=30
        )

        data = response.json()

        if data.get(
            "pp_ResponseCode"
        ) == "000":

            return {
                "success": True,
                "transaction_id":
                    data.get(
                        "pp_TxnRefNo",
                        order_number
                    ),
                "message":
                    data.get(
                        "pp_ResponseMessage",
                        "Payment successful."
                    )
            }

        return {
            "success": False,
            "transaction_id": None,
            "message":
                data.get(
                    "pp_ResponseMessage",
                    "JazzCash payment failed."
                )
        }

    except Exception as error:

        print(
            "JAZZCASH API ERROR:",
            str(error),
            flush=True
        )

        return {
            "success": False,
            "transaction_id": None,
            "message":
                "Could not reach JazzCash. "
                "Please try again."
        }


# =========================================================
# EASYPAISA MOBILE ACCOUNT PAYMENT
# =========================================================

def easypaisa_generate_hash(
    raw_string,
    hashkey
):

    return hmac.new(
        hashkey.encode("utf-8"),
        raw_string.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def easypaisa_charge(
    amount_pkr,
    mobile_number,
    order_number
):

    # TEST MODE
    if PAYMENT_TEST_MODE:

        return {
            "success": True,
            "transaction_id": (
                f"TEST-EP-"
                f"{uuid.uuid4().hex[:10].upper()}"
            ),
            "message": (
                "Test mode: Easypaisa payment "
                "simulated as successful."
            )
        }

    cfg = EASYPAISA_CONFIG

    payload = {

        "orderId":
            order_number,

        "storeId":
            cfg["store_id"],

        "transactionAmount":
            f"{float(amount_pkr):.1f}",

        "transactionType":
            "MA",

        "mobileAccountNo":
            mobile_number,

        "emailAddress":
            ""
    }

    raw_string = "&".join(
        f"{key}={value}"
        for key, value
        in sorted(payload.items())
        if value != ""
    )

    payload["merchantHashedReq"] = (
        easypaisa_generate_hash(
            raw_string,
            cfg["hashkey"]
        )
    )

    try:

        response = requests.post(
            cfg["api_url"],
            json=payload,
            auth=(
                cfg["username"],
                cfg["password"]
            ),
            timeout=30
        )

        data = response.json()

        if (
            str(
                data.get("responseCode")
            ) in ("0", "0000")
            or
            data.get("success") is True
        ):

            return {
                "success": True,
                "transaction_id":
                    data.get(
                        "transactionId",
                        order_number
                    ),
                "message":
                    data.get(
                        "responseDesc",
                        "Payment successful."
                    )
            }

        return {
            "success": False,
            "transaction_id": None,
            "message":
                data.get(
                    "responseDesc",
                    "Easypaisa payment failed."
                )
        }

    except Exception as error:

        print(
            "EASYPAISA API ERROR:",
            str(error),
            flush=True
        )

        return {
            "success": False,
            "transaction_id": None,
            "message":
                "Could not reach Easypaisa. "
                "Please try again."
        }


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db():

    conn = sqlite3.connect(
        DATABASE,
        timeout=30
    )

    conn.row_factory = sqlite3.Row

    conn.execute(
        "PRAGMA foreign_keys = ON"
    )

    conn.execute(
        "PRAGMA journal_mode = WAL"
    )

    return conn


# =========================================================
# DATABASE HELPERS
# =========================================================

def column_exists(
    conn,
    table_name,
    column_name
):

    columns = conn.execute(
        f'PRAGMA table_info("{table_name}")'
    ).fetchall()

    return any(
        column["name"] == column_name
        for column in columns
    )


def add_column_if_missing(
    conn,
    table_name,
    column_name,
    column_definition
):

    if not column_exists(
        conn,
        table_name,
        column_name
    ):

        conn.execute(
            f'ALTER TABLE "{table_name}" '
            f'ADD COLUMN "{column_name}" '
            f'{column_definition}'
        )

        print(
            f"Added missing column: "
            f"{table_name}.{column_name}",
            flush=True
        )


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def init_db():

    conn = get_db()

    cursor = conn.cursor()

    # =====================================================
    # PRODUCTS TABLE
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS products (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            category TEXT NOT NULL,

            description TEXT DEFAULT '',

            price REAL NOT NULL DEFAULT 0,

            image TEXT DEFAULT '',

            rating REAL DEFAULT 0,

            available INTEGER DEFAULT 1,

            created_at
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # =====================================================
    # ORDERS TABLE
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            order_number TEXT,

            customer_name
                TEXT NOT NULL DEFAULT '',

            phone
                TEXT NOT NULL DEFAULT '',

            email
                TEXT NOT NULL DEFAULT '',

            address
                TEXT NOT NULL DEFAULT '',

            city
                TEXT NOT NULL DEFAULT '',

            instructions
                TEXT DEFAULT '',

            payment_method
                TEXT NOT NULL
                DEFAULT 'Cash on Delivery',

            subtotal
                REAL NOT NULL DEFAULT 0,

            discount
                REAL NOT NULL DEFAULT 0,

            delivery_fee
                REAL NOT NULL DEFAULT 0,

            total
                REAL NOT NULL DEFAULT 0,

            status
                TEXT NOT NULL DEFAULT 'Pending',

            payment_status
                TEXT NOT NULL DEFAULT 'Unpaid',

            transaction_id
                TEXT DEFAULT '',

            created_at
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # =====================================================
    # ORDER ITEMS TABLE
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS order_items (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            order_id INTEGER NOT NULL,

            product_id INTEGER,

            product_name
                TEXT NOT NULL DEFAULT '',

            price
                REAL NOT NULL DEFAULT 0,

            quantity
                INTEGER NOT NULL DEFAULT 1,

            item_total
                REAL NOT NULL DEFAULT 0,

            image
                TEXT DEFAULT '',

            FOREIGN KEY(order_id)
                REFERENCES orders(id)
                ON DELETE CASCADE,

            FOREIGN KEY(product_id)
                REFERENCES products(id)
                ON DELETE SET NULL
        )
        """
    )

    # =====================================================
    # MIGRATION
    # =====================================================

    print(
        "Checking database structure...",
        flush=True
    )

    # PRODUCTS

    add_column_if_missing(
        conn,
        "products",
        "stock",
        "INTEGER NOT NULL DEFAULT 100"
    )

    # ORDERS

    add_column_if_missing(
        conn,
        "orders",
        "order_number",
        "TEXT"
    )

    add_column_if_missing(
        conn,
        "orders",
        "customer_name",
        "TEXT NOT NULL DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "orders",
        "phone",
        "TEXT NOT NULL DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "orders",
        "email",
        "TEXT NOT NULL DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "orders",
        "address",
        "TEXT NOT NULL DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "orders",
        "city",
        "TEXT NOT NULL DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "orders",
        "instructions",
        "TEXT DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "orders",
        "payment_method",
        "TEXT NOT NULL DEFAULT 'Cash on Delivery'"
    )

    add_column_if_missing(
        conn,
        "orders",
        "subtotal",
        "REAL NOT NULL DEFAULT 0"
    )

    add_column_if_missing(
        conn,
        "orders",
        "discount",
        "REAL NOT NULL DEFAULT 0"
    )

    add_column_if_missing(
        conn,
        "orders",
        "delivery_fee",
        "REAL NOT NULL DEFAULT 0"
    )

    add_column_if_missing(
        conn,
        "orders",
        "total",
        "REAL NOT NULL DEFAULT 0"
    )

    add_column_if_missing(
        conn,
        "orders",
        "status",
        "TEXT NOT NULL DEFAULT 'Pending'"
    )

    add_column_if_missing(
        conn,
        "orders",
        "payment_status",
        "TEXT NOT NULL DEFAULT 'Unpaid'"
    )

    add_column_if_missing(
        conn,
        "orders",
        "transaction_id",
        "TEXT DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "orders",
        "created_at",
        "TIMESTAMP"
    )

    # ORDER ITEMS

    add_column_if_missing(
        conn,
        "order_items",
        "product_id",
        "INTEGER"
    )

    add_column_if_missing(
        conn,
        "order_items",
        "product_name",
        "TEXT NOT NULL DEFAULT ''"
    )

    add_column_if_missing(
        conn,
        "order_items",
        "price",
        "REAL NOT NULL DEFAULT 0"
    )

    add_column_if_missing(
        conn,
        "order_items",
        "quantity",
        "INTEGER NOT NULL DEFAULT 1"
    )

    add_column_if_missing(
        conn,
        "order_items",
        "item_total",
        "REAL NOT NULL DEFAULT 0"
    )

    add_column_if_missing(
        conn,
        "order_items",
        "image",
        "TEXT DEFAULT ''"
    )

    # =====================================================
    # GENERATE ORDER NUMBERS FOR OLD ORDERS
    # =====================================================

    old_orders = conn.execute(
        """
        SELECT id
        FROM orders
        WHERE order_number IS NULL
           OR TRIM(order_number) = ''
        """
    ).fetchall()

    for old_order in old_orders:

        old_id = old_order["id"]

        order_number = (
            f"SV-OLD-{old_id:06d}"
        )

        conn.execute(
            """
            UPDATE orders
            SET order_number = ?
            WHERE id = ?
            """,
            (
                order_number,
                old_id
            )
        )

    # =====================================================
    # UNIQUE INDEX
    # =====================================================

    cursor.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS
        idx_orders_order_number
        ON orders(order_number)
        """
    )

    conn.commit()

    conn.close()

    print(
        "Database initialized successfully.",
        flush=True
    )


# =========================================================
# INITIALIZE DATABASE
# =========================================================

init_db()


# =========================================================
# WEBSITE ROUTES
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# CUSTOMER ORDER TRACKING (no login required)
# =========================================================

@app.route("/track-order")
def track_order_page():

    return render_template(
        "track_order.html"
    )


@app.route(
    "/api/track-order",
    methods=["POST"]
)
def track_order_api():

    try:

        data = request.get_json(
            force=True,
            silent=True
        ) or {}

        order_number = str(
            data.get("order_number", "")
        ).strip()

        phone = str(
            data.get("phone", "")
        ).strip()

        # Normalize phone: compare digits only, so
        # "0300-1234567" and "03001234567" both match.

        phone_digits = re.sub(
            r"\D",
            "",
            phone
        )

        if not order_number or not phone_digits:

            return jsonify({
                "success": False,
                "message":
                    "Order number and phone "
                    "number are required."
            }), 400

        conn = get_db()

        order = conn.execute(
            """
            SELECT *
            FROM orders
            WHERE order_number = ?
            """,
            (order_number,)
        ).fetchone()

        if (
            order is None
            or re.sub(
                r"\D",
                "",
                order["phone"] or ""
            ) != phone_digits
        ):

            conn.close()

            # Same generic message whether the order
            # doesn't exist or the phone doesn't match,
            # so this endpoint can't be used to check
            # whether a given order number is valid.

            return jsonify({
                "success": False,
                "message":
                    "No matching order found. Please "
                    "check your order number and phone "
                    "number."
            }), 404

        items = conn.execute(
            """
            SELECT
                product_name,
                price,
                quantity,
                item_total,
                image
            FROM order_items
            WHERE order_id = ?
            """,
            (order["id"],)
        ).fetchall()

        conn.close()

        return jsonify({
            "success": True,
            "order": {
                "order_number": order["order_number"],
                "status": order["status"],
                "payment_status": order["payment_status"],
                "payment_method": order["payment_method"],
                "created_at": order["created_at"],
                "customer_name": order["customer_name"],
                "address": order["address"],
                "city": order["city"],
                "subtotal": order["subtotal"],
                "discount": order["discount"],
                "delivery_fee": order["delivery_fee"],
                "total": order["total"],
                "items": [
                    dict(item)
                    for item in items
                ]
            }
        }), 200

    except Exception as e:

        print(
            "TRACK ORDER ERROR:",
            str(e),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Something went wrong. "
                "Please try again."
        }), 500


# =========================================================
# ADMIN ROUTES
# =========================================================

@app.route("/admin")
@app.route("/admin/orders")
@app.route("/admin/products")
@login_required
def admin():

    return render_template(
        "admin.html"
    )


@app.route("/api/admin/stream")
@login_required
def admin_stream():
    """
    Server-Sent Events endpoint for the live admin
    dashboard. The browser opens this once (via
    EventSource) and keeps it open; the server pushes a
    message the instant a new order arrives or a status
    changes, so the dashboard updates itself with no
    manual refresh.
    """

    client_queue = queue.Queue(maxsize=100)

    with sse_lock:
        sse_subscribers.append(client_queue)

    def event_stream():

        try:

            # Tell the browser we're connected right away.
            yield "event: connected\ndata: {}\n\n"

            while True:

                try:

                    message = client_queue.get(
                        timeout=20
                    )

                    yield f"data: {message}\n\n"

                except queue.Empty:

                    # Heartbeat comment keeps the
                    # connection alive through proxies
                    # and lets the browser detect a
                    # dead connection quickly.
                    yield ": heartbeat\n\n"

        finally:

            with sse_lock:
                if client_queue in sse_subscribers:
                    sse_subscribers.remove(client_queue)

    response = Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream"
    )

    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    response.headers["Connection"] = "keep-alive"

    return response


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.route(
    "/admin/login",
    methods=["GET", "POST"]
)
def admin_login():

    error = None

    if request.method == "POST":

        username = request.form.get(
            "username",
            ""
        ).strip()

        password = request.form.get(
            "password",
            ""
        )

        if (
            username == ADMIN_USERNAME
            and
            check_password_hash(
                ADMIN_PASSWORD_HASH,
                password
            )
        ):

            session[
                "admin_logged_in"
            ] = True

            return redirect(
                url_for("admin")
            )

        error = (
            "Invalid username or password."
        )

    return render_template(
        "admin_login.html",
        error=error
    )


# =========================================================
# ADMIN LOGOUT
# =========================================================

@app.route("/admin/logout")
def admin_logout():

    session.pop(
        "admin_logged_in",
        None
    )

    return redirect(
        url_for("admin_login")
    )


# =========================================================
# GET PRODUCTS
# =========================================================

@app.route(
    "/api/products",
    methods=["GET"]
)
def get_products():

    try:

        conn = get_db()

        products = conn.execute(
            """
            SELECT *
            FROM products
            ORDER BY id DESC
            """
        ).fetchall()

        conn.close()

        return jsonify(
            [
                dict(product)
                for product in products
            ]
        )

    except Exception as error:

        print(
            "GET PRODUCTS ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not load products."
        }), 500


# =========================================================
# GET SINGLE PRODUCT
# =========================================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["GET"]
)
def get_product(product_id):

    try:

        conn = get_db()

        product = conn.execute(
            """
            SELECT *
            FROM products
            WHERE id = ?
            """,
            (product_id,)
        ).fetchone()

        conn.close()

        if not product:

            return jsonify({
                "success": False,
                "message":
                    "Product not found."
            }), 404

        return jsonify({
            "success": True,
            "product": dict(product)
        })

    except Exception as error:

        print(
            "GET PRODUCT ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not load product."
        }), 500


# =========================================================
# ADD PRODUCT
# =========================================================

@app.route(
    "/api/products",
    methods=["POST"]
)
@login_required
def add_product():

    try:

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        name = str(
            data.get("name", "")
        ).strip()

        category = str(
            data.get("category", "")
        ).strip()

        description = str(
            data.get("description", "")
        ).strip()

        image = str(
            data.get("image", "")
        ).strip()

        price = float(
            data.get("price", 0)
        )

        rating = float(
            data.get("rating", 0)
        )

        available = int(
            data.get("available", 1)
        )

        try:

            stock = int(
                data.get("stock", 0)
            )

        except (TypeError, ValueError):

            stock = 0

        if stock < 0:
            stock = 0

        if not name or not category:

            return jsonify({
                "success": False,
                "message":
                    "Name and Category are required."
            }), 400

        conn = get_db()

        cursor = conn.execute(
            """
            INSERT INTO products (
                name,
                category,
                description,
                price,
                image,
                rating,
                available,
                stock
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                category,
                description,
                price,
                image,
                rating,
                available,
                stock
            )
        )

        conn.commit()

        product_id = cursor.lastrowid

        conn.close()

        return jsonify({
            "success": True,
            "message":
                "Product added successfully.",
            "id": product_id
        }), 201

    except Exception as error:

        print(
            "ADD PRODUCT ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not add product."
        }), 500


# =========================================================
# UPDATE PRODUCT
# =========================================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["PUT"]
)
@login_required
def update_product(product_id):

    try:

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        name = str(
            data.get("name", "")
        ).strip()

        category = str(
            data.get("category", "")
        ).strip()

        description = str(
            data.get("description", "")
        ).strip()

        image = str(
            data.get("image", "")
        ).strip()

        price = float(
            data.get("price", 0)
        )

        rating = float(
            data.get("rating", 0)
        )

        available = int(
            data.get("available", 1)
        )

        try:

            stock = int(
                data.get("stock", 0)
            )

        except (TypeError, ValueError):

            stock = 0

        if stock < 0:
            stock = 0

        if not name or not category:

            return jsonify({
                "success": False,
                "message":
                    "Name and Category are required."
            }), 400

        conn = get_db()

        cursor = conn.execute(
            """
            UPDATE products
            SET
                name = ?,
                category = ?,
                description = ?,
                price = ?,
                image = ?,
                rating = ?,
                available = ?,
                stock = ?
            WHERE id = ?
            """,
            (
                name,
                category,
                description,
                price,
                image,
                rating,
                available,
                stock,
                product_id
            )
        )

        conn.commit()

        affected_rows = cursor.rowcount

        conn.close()

        if affected_rows == 0:

            return jsonify({
                "success": False,
                "message":
                    "Product not found."
            }), 404

        return jsonify({
            "success": True,
            "message":
                "Product updated successfully."
        })

    except Exception as error:

        print(
            "UPDATE PRODUCT ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not update product."
        }), 500


# =========================================================
# DELETE PRODUCT
# =========================================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["DELETE"]
)
@login_required
def delete_product(product_id):

    try:

        conn = get_db()

        cursor = conn.execute(
            """
            DELETE FROM products
            WHERE id = ?
            """,
            (product_id,)
        )

        conn.commit()

        affected_rows = cursor.rowcount

        conn.close()

        if affected_rows == 0:

            return jsonify({
                "success": False,
                "message":
                    "Product not found."
            }), 404

        return jsonify({
            "success": True,
            "message":
                "Product deleted successfully."
        })

    except Exception as error:

        print(
            "DELETE PRODUCT ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not delete product."
        }), 500


# =========================================================
# SEND ORDER CONFIRMATION EMAIL
# =========================================================

def send_order_confirmation_email(
    customer_name,
    customer_email,
    order_number,
    items,
    subtotal,
    discount,
    delivery_fee,
    total,
    address,
    city,
    payment_method
):

    if not customer_email:
        return

    # Email password missing
    if not app.config.get(
        "MAIL_PASSWORD"
    ):

        print(
            "EMAIL SKIPPED: "
            "MAIL_PASSWORD is not configured.",
            flush=True
        )

        return

    try:

        items_html = ""

        for item in items:

            items_html += f"""
            <tr>
                <td style="
                    padding:8px;
                    border-bottom:1px solid #eee;
                ">
                    {item['name']}
                </td>

                <td style="
                    padding:8px;
                    border-bottom:1px solid #eee;
                    text-align:center;
                ">
                    {item['quantity']}
                </td>

                <td style="
                    padding:8px;
                    border-bottom:1px solid #eee;
                    text-align:right;
                ">
                    Rs. {item['item_total']:.0f}
                </td>
            </tr>
            """

        delivery_text = (
            "FREE"
            if delivery_fee == 0
            else f"Rs. {int(delivery_fee)}"
        )

        html_body = f"""
        <div style="
            font-family:Arial,sans-serif;
            max-width:600px;
            margin:auto;
        ">

            <div style="
                background:#f25c05;
                padding:20px;
                text-align:center;
            ">
                <h1 style="
                    color:white;
                    margin:0;
                ">
                    Savora
                </h1>
            </div>

            <div style="
                padding:20px;
            ">

                <h2>
                    Order Confirmed! 🎉
                </h2>

                <p>
                    Hi {customer_name},
                </p>

                <p>
                    Thank you for your order.
                    Here are your order details:
                </p>

                <p>
                    <strong>
                        Order Number:
                    </strong>
                    {order_number}
                </p>

                <p>
                    <strong>
                        Payment Method:
                    </strong>
                    {payment_method}
                </p>

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    margin-top:15px;
                ">

                    <tr style="
                        background:#f5f5f5;
                    ">

                        <th style="
                            padding:8px;
                            text-align:left;
                        ">
                            Item
                        </th>

                        <th style="
                            padding:8px;
                            text-align:center;
                        ">
                            Qty
                        </th>

                        <th style="
                            padding:8px;
                            text-align:right;
                        ">
                            Price
                        </th>

                    </tr>

                    {items_html}

                </table>

                <table style="
                    width:100%;
                    margin-top:15px;
                ">

                    <tr>
                        <td>
                            Subtotal
                        </td>

                        <td style="
                            text-align:right;
                        ">
                            Rs. {subtotal:.0f}
                        </td>
                    </tr>

                    <tr>
                        <td>
                            Discount
                        </td>

                        <td style="
                            text-align:right;
                        ">
                            - Rs. {discount:.0f}
                        </td>
                    </tr>

                    <tr>
                        <td>
                            Delivery Fee
                        </td>

                        <td style="
                            text-align:right;
                        ">
                            {delivery_text}
                        </td>
                    </tr>

                    <tr style="
                        font-weight:bold;
                        font-size:16px;
                    ">

                        <td style="
                            padding-top:10px;
                        ">
                            Total
                        </td>

                        <td style="
                            text-align:right;
                            padding-top:10px;
                        ">
                            Rs. {total:.0f}
                        </td>

                    </tr>

                </table>

                <p style="
                    margin-top:20px;
                ">

                    <strong>
                        Delivery Address:
                    </strong>

                    <br>

                    {address}, {city}

                </p>

                <p style="
                    margin-top:30px;
                    color:#888;
                    font-size:13px;
                ">

                    If you have any questions
                    about your order, feel free
                    to reply to this email.

                </p>

            </div>

        </div>
        """

        msg = Message(
            subject=(
                f"Order Confirmed - "
                f"{order_number} | Savora"
            ),
            recipients=[
                customer_email
            ],
            html=html_body
        )

        mail.send(msg)

        print(
            f"Confirmation email sent to "
            f"{customer_email}",
            flush=True
        )

    except Exception as error:

        print(
            "EMAIL SEND ERROR:",
            str(error),
            flush=True
        )


# =========================================================
# JAZZCASH PAYMENT ROUTE
# =========================================================

@app.route(
    "/api/payment/jazzcash/charge",
    methods=["POST"]
)
def jazzcash_charge_route():

    try:

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        amount = data.get(
            "amount"
        )

        mobile_number = str(
            data.get(
                "mobile_number",
                ""
            )
        ).strip()

        cnic_last6 = str(
            data.get(
                "cnic_last6",
                ""
            )
        ).strip()

        order_number = (
            data.get("order_number")
            or
            f"SV-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )

        if (
            not amount
            or
            float(amount) <= 0
        ):

            return jsonify({
                "success": False,
                "message":
                    "Invalid amount."
            }), 400

        if not re.match(
            r"^03\d{9}$",
            mobile_number
        ):

            return jsonify({
                "success": False,
                "message":
                    "Please enter a valid "
                    "JazzCash number "
                    "(03XXXXXXXXX)."
            }), 400

        if (
            not PAYMENT_TEST_MODE
            and
            not re.match(
                r"^\d{6}$",
                cnic_last6
            )
        ):

            return jsonify({
                "success": False,
                "message":
                    "Please enter the last "
                    "6 digits of your CNIC."
            }), 400

        result = jazzcash_charge(
            amount,
            mobile_number,
            cnic_last6,
            order_number
        )

        return jsonify(result), (
            200
            if result["success"]
            else 402
        )

    except Exception as error:

        print(
            "JAZZCASH CHARGE ROUTE ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Payment could not be processed."
        }), 500


# =========================================================
# EASYPAISA PAYMENT ROUTE
# =========================================================

@app.route(
    "/api/payment/easypaisa/charge",
    methods=["POST"]
)
def easypaisa_charge_route():

    try:

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        amount = data.get(
            "amount"
        )

        mobile_number = str(
            data.get(
                "mobile_number",
                ""
            )
        ).strip()

        order_number = (
            data.get("order_number")
            or
            f"SV-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )

        if (
            not amount
            or
            float(amount) <= 0
        ):

            return jsonify({
                "success": False,
                "message":
                    "Invalid amount."
            }), 400

        if not re.match(
            r"^03\d{9}$",
            mobile_number
        ):

            return jsonify({
                "success": False,
                "message":
                    "Please enter a valid "
                    "Easypaisa number "
                    "(03XXXXXXXXX)."
            }), 400

        result = easypaisa_charge(
            amount,
            mobile_number,
            order_number
        )

        return jsonify(result), (
            200
            if result["success"]
            else 402
        )

    except Exception as error:

        print(
            "EASYPAISA CHARGE ROUTE ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Payment could not be processed."
        }), 500


# =========================================================
# CREATE ORDER
# =========================================================

@app.route(
    "/api/orders",
    methods=["POST"]
)
def create_order():

    conn = None

    try:

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        # =================================================
        # 1. CUSTOMER INFORMATION
        # =================================================

        customer_info = (
            data.get("customer")
            or {}
        )

        customer_name = (
            customer_info.get("name")
            or data.get("customer_name")
            or ""
        ).strip()

        phone = (
            customer_info.get("phone")
            or data.get("phone")
            or ""
        ).strip()

        email = (
            customer_info.get("email")
            or data.get("email")
            or ""
        ).strip()

        address = (
            customer_info.get("address")
            or data.get("address")
            or ""
        ).strip()

        city = (
            customer_info.get("city")
            or data.get("city")
            or ""
        ).strip()

        instructions = str(
            data.get(
                "instructions",
                ""
            )
        ).strip()

        payment_method = str(
            data.get(
                "payment",
                "Cash on Delivery"
            )
        ).strip()

        payment_status = str(
            data.get(
                "payment_status",
                "Unpaid"
            )
        ).strip()

        transaction_id = str(
            data.get(
                "transaction_id",
                ""
            )
        ).strip()

        # =================================================
        # 2. MOBILE WALLET VALIDATION
        # =================================================

        if (
            payment_method == "Mobile Wallet"
            and
            not transaction_id
        ):

            return jsonify({
                "success": False,
                "message":
                    "Payment was not completed. "
                    "Please retry the mobile "
                    "wallet payment."
            }), 402

        # =================================================
        # 3. ITEMS AND TOTALS
        # =================================================

        items = data.get(
            "items"
        ) or []

        totals = data.get(
            "totals"
        ) or {}

        # =================================================
        # 4. CUSTOMER VALIDATION
        # =================================================

        if (
            not customer_name
            or not phone
            or not address
            or not city
        ):

            return jsonify({
                "success": False,
                "message":
                    "Customer Name, Phone, "
                    "Address & City are required."
            }), 400

        if (
            email
            and
            not is_valid_email(email)
        ):

            return jsonify({
                "success": False,
                "message":
                    "Please enter a valid "
                    "email address "
                    "(e.g. name@example.com)."
            }), 400

        if not is_valid_phone(phone):

            return jsonify({
                "success": False,
                "message":
                    "Please enter a valid "
                    "phone number "
                    "(e.g. 03001234567)."
            }), 400

        if not items:

            return jsonify({
                "success": False,
                "message":
                    "Order must contain "
                    "at least one item."
            }), 400

        # =================================================
        # 5. PROCESS ITEMS
        # (price/name are always trusted from the DATABASE,
        #  never from the client, to prevent price tampering.
        #  Stock is checked AND reserved in the same
        #  transaction below, so two simultaneous orders
        #  can't both buy the last item.)
        # =================================================

        conn = get_db()

        conn.execute("BEGIN IMMEDIATE")

        subtotal = 0

        clean_items = []

        out_of_stock_messages = []

        for item in items:

            try:

                quantity = int(
                    item.get(
                        "quantity",
                        1
                    )
                )

            except (
                TypeError,
                ValueError
            ):

                quantity = 0

            if quantity <= 0:
                continue

            product_id = item.get("id")

            product_row = None

            if product_id is not None:

                try:

                    product_row = conn.execute(
                        """
                        SELECT id, name, price, image,
                               available, stock
                        FROM products
                        WHERE id = ?
                        """,
                        (int(product_id),)
                    ).fetchone()

                except (TypeError, ValueError):

                    product_row = None

            if (
                product_row is None
                or not product_row["available"]
            ):
                # Unknown / unavailable product_id:
                # skip it instead of trusting client price.
                continue

            if quantity > product_row["stock"]:

                out_of_stock_messages.append(
                    f"{product_row['name']} "
                    f"(only {product_row['stock']} "
                    f"left in stock)"
                )

                continue

            item_name = product_row["name"]
            price = float(product_row["price"])
            image = product_row["image"] or ""

            if price < 0:
                price = 0

            item_total = (
                price * quantity
            )

            subtotal += item_total

            clean_items.append({
                "product_id": product_row["id"],
                "name": item_name,
                "price": price,
                "quantity": quantity,
                "image": image,
                "item_total": item_total
            })

        if out_of_stock_messages:

            conn.rollback()
            conn.close()
            conn = None

            return jsonify({
                "success": False,
                "message":
                    "Some items don't have enough stock: "
                    + "; ".join(out_of_stock_messages)
            }), 409

        if not clean_items:

            conn.rollback()
            conn.close()
            conn = None

            return jsonify({
                "success": False,
                "message":
                    "Order must contain "
                    "valid items."
            }), 400

        # =================================================
        # 6. CALCULATIONS
        # (discount is only ever derived server-side from a
        #  valid coupon code — the client cannot set an
        #  arbitrary discount amount)
        # =================================================

        promo_code = str(
            data.get("promo_code", "")
        ).strip().upper()

        discount_rate = COUPON_CODES.get(
            promo_code,
            0
        )

        discount = round(
            subtotal * discount_rate
        )

        delivery_fee = (
            0
            if subtotal >= 2000
            else 150
        )

        total = (
            subtotal
            - discount
            + delivery_fee
        )

        # =================================================
        # 7. ORDER NUMBER
        # =================================================

        now = datetime.now()

        timestamp = now.strftime(
            "%Y%m%d%H%M%S"
        )

        micro = now.microsecond

        order_number = (
            f"SV-{timestamp}-{micro:06d}"
        )

        # =================================================
        # 8. DATABASE (same connection/transaction as the
        #    stock check above)
        # =================================================

        cursor = conn.cursor()

        # =================================================
        # 9. INSERT ORDER
        # =================================================

        cursor.execute(
            """
            INSERT INTO orders (

                order_number,
                customer_name,
                phone,
                email,
                address,
                city,
                instructions,
                payment_method,
                subtotal,
                discount,
                delivery_fee,
                total,
                status,
                payment_status,
                transaction_id

            )

            VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?
            )
            """,
            (
                order_number,
                customer_name,
                phone,
                email,
                address,
                city,
                instructions,
                payment_method,
                subtotal,
                discount,
                delivery_fee,
                total,
                "Pending",
                payment_status,
                transaction_id
            )
        )

        order_id = cursor.lastrowid

        # =================================================
        # 10. INSERT ORDER ITEMS + DECREMENT STOCK
        # =================================================

        for item in clean_items:

            cursor.execute(
                """
                INSERT INTO order_items (

                    order_id,
                    product_id,
                    product_name,
                    price,
                    quantity,
                    item_total,
                    image

                )

                VALUES (
                    ?, ?, ?, ?, ?, ?, ?
                )
                """,
                (
                    order_id,
                    item["product_id"],
                    item["name"],
                    item["price"],
                    item["quantity"],
                    item["item_total"],
                    item["image"]
                )
            )

            conn.execute(
                """
                UPDATE products
                SET stock = stock - ?
                WHERE id = ?
                """,
                (
                    item["quantity"],
                    item["product_id"]
                )
            )

        # =================================================
        # 11. COMMIT
        # =================================================

        conn.commit()

        conn.close()

        conn = None

        # =================================================
        # 11b. LIVE DASHBOARD NOTIFICATION
        # =================================================

        broadcast_event("new_order", {
            "order_id": order_id,
            "order_number": order_number,
            "customer_name": customer_name,
            "total": total,
            "payment_method": payment_method,
            "item_count": len(clean_items)
        })

        # =================================================
        # 12. SEND EMAIL
        # =================================================

        send_order_confirmation_email(
            customer_name=customer_name,
            customer_email=email,
            order_number=order_number,
            items=clean_items,
            subtotal=subtotal,
            discount=discount,
            delivery_fee=delivery_fee,
            total=total,
            address=address,
            city=city,
            payment_method=payment_method
        )

        # =================================================
        # 12b. SEND WHATSAPP CONFIRMATION
        # =================================================

        send_whatsapp_order_confirmation(
            customer_name=customer_name,
            phone=phone,
            order_number=order_number,
            total=total,
            payment_method=payment_method
        )

        # =================================================
        # 13. SUCCESS
        # =================================================

        return jsonify({

            "success": True,

            "message":
                "Order placed successfully.",

            "order_id":
                order_number,

            "id":
                order_id,

            "order_number":
                order_number

        }), 201

    except Exception as error:

        if conn is not None:

            try:
                conn.rollback()
                conn.close()
            except Exception:
                pass

        print(
            "CREATE ORDER ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                f"Server Error: {str(error)}"
        }), 500


# =========================================================
# TODAY ANALYTICS
# =========================================================

@app.route(
    "/api/analytics/today",
    methods=["GET"]
)
@login_required
def get_today_analytics():

    try:

        conn = get_db()

        # =================================================
        # TODAY SALES
        # =================================================

        today_row = conn.execute(
            """
            SELECT

                COALESCE(
                    SUM(total),
                    0
                ) AS today_sales,

                COUNT(*) AS today_orders_count

            FROM orders

            WHERE
                date(created_at)
                =
                date('now', 'localtime')

                AND status != 'Cancelled'
            """
        ).fetchone()

        # =================================================
        # BEST SELLER
        # =================================================

        best_seller_row = conn.execute(
            """
            SELECT

                product_name,

                SUM(quantity)
                    AS total_quantity

            FROM order_items

            GROUP BY product_name

            ORDER BY total_quantity DESC

            LIMIT 1
            """
        ).fetchone()

        conn.close()

        return jsonify({

            "today_sales":
                today_row["today_sales"],

            "today_orders_count":
                today_row["today_orders_count"],

            "best_seller_name":
                (
                    best_seller_row[
                        "product_name"
                    ]
                    if best_seller_row
                    else "N/A"
                ),

            "best_seller_quantity":
                (
                    best_seller_row[
                        "total_quantity"
                    ]
                    if best_seller_row
                    else 0
                )
        })

    except Exception as error:

        print(
            "ANALYTICS ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not load analytics."
        }), 500


# =========================================================
# GET ALL ORDERS
# =========================================================

@app.route(
    "/api/orders",
    methods=["GET"]
)
@login_required
def get_orders():

    try:

        conn = get_db()

        orders = conn.execute(
            """
            SELECT *
            FROM orders
            ORDER BY id DESC
            """
        ).fetchall()

        conn.close()

        return jsonify(
            [
                dict(order)
                for order in orders
            ]
        )

    except Exception as error:

        print(
            "GET ORDERS ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not load orders."
        }), 500


# =========================================================
# GET SINGLE ORDER
# =========================================================

@app.route(
    "/api/orders/<int:order_id>",
    methods=["GET"]
)
def get_order(order_id):

    try:

        conn = get_db()

        order = conn.execute(
            """
            SELECT *
            FROM orders
            WHERE id = ?
            """,
            (order_id,)
        ).fetchone()

        if not order:

            conn.close()

            return jsonify({
                "success": False,
                "message":
                    "Order not found."
            }), 404

        items = conn.execute(
            """
            SELECT *
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
            """,
            (order_id,)
        ).fetchall()

        conn.close()

        order_data = dict(
            order
        )

        order_data["items"] = [
            dict(item)
            for item in items
        ]

        return jsonify({
            "success": True,
            "order": order_data
        })

    except Exception as error:

        print(
            "GET ORDER ERROR:",
            str(error),
            flush=True
        )

        return jsonify({
            "success": False,
            "message":
                "Could not load order details."
        }), 500


# =========================================================
# SEND ORDER STATUS EMAIL
# =========================================================

def send_status_update_email(
    customer_name,
    customer_email,
    order_number,
    status
):

    if not customer_email:
        return

    # Email password missing
    if not app.config.get(
        "MAIL_PASSWORD"
    ):

        print(
            "STATUS EMAIL SKIPPED: "
            "MAIL_PASSWORD is not configured.",
            flush=True
        )

        return

    status_messages = {

        "Confirmed":
            "Your order has been confirmed "
            "and is being prepared for you.",

        "Preparing":
            "Our kitchen is preparing "
            "your order right now.",

        "Out for Delivery":
            "Your order is on its way! "
            "It will reach you shortly.",

        "Delivered":
            "Your order has been delivered. "
            "We hope you enjoy it!",

        "Cancelled":
            "Your order has been cancelled. "
            "If this wasn't expected, "
            "please contact us."
    }

    status_colors = {

        "Confirmed":
            "#2980b9",

        "Preparing":
            "#e67e22",

        "Out for Delivery":
            "#8e44ad",

        "Delivered":
            "#27ae60",

        "Cancelled":
            "#c0392b"
    }

    message = status_messages.get(
        status,
        f"Your order status has been "
        f"updated to: {status}"
    )

    color = status_colors.get(
        status,
        "#f25c05"
    )

    try:

        html_body = f"""
        <div style="
            font-family:Arial,sans-serif;
            max-width:600px;
            margin:auto;
        ">

            <div style="
                background:#f25c05;
                padding:20px;
                text-align:center;
            ">

                <h1 style="
                    color:white;
                    margin:0;
                ">
                    Savora
                </h1>

            </div>

            <div style="
                padding:25px;
            ">

                <p>
                    Hi {customer_name},
                </p>

                <div style="
                    background:{color};
                    color:white;
                    padding:15px;
                    border-radius:8px;
                    text-align:center;
                    margin:20px 0;
                ">

                    <h2 style="
                        margin:0;
                    ">
                        {status}
                    </h2>

                </div>

                <p style="
                    font-size:15px;
                ">
                    {message}
                </p>

                <p style="
                    margin-top:20px;
                ">

                    <strong>
                        Order Number:
                    </strong>

                    {order_number}

                </p>

                <p style="
                    margin-top:30px;
                    color:#888;
                    font-size:13px;
                ">

                    If you have any questions,
                    feel free to reply to this email.

                </p>

            </div>

        </div>
        """

        msg = Message(

            subject=(
                f"Order {status} - "
                f"{order_number} | Savora"
            ),

            recipients=[
                customer_email
            ],

            html=html_body
        )

        mail.send(msg)

        print(
            f"Status update email sent to "
            f"{customer_email}",
            flush=True
        )

    except Exception as error:

        print(
            "STATUS EMAIL ERROR:",
            str(error),
            flush=True
        )


# =========================================================
# UPDATE ORDER STATUS
# =========================================================

@app.route(
    "/api/orders/<int:order_id>/status",
    methods=["PUT"]
)
@login_required
def update_order_status(
    order_id
):

    try:

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        status = str(
            data.get(
                "status",
                ""
            )
        ).strip()

        allowed_statuses = [

            "Pending",

            "Confirmed",

            "Preparing",

            "Out for Delivery",

            "Delivered",

            "Cancelled"
        ]

        if status not in allowed_statuses:

            return jsonify({
                "success": False,
                "message":
                    "Invalid status."
            }), 400

        conn = get_db()

        # =================================================
        # GET CUSTOMER INFORMATION
        # =================================================

        order = conn.execute(
            """
            SELECT
                customer_name,
                email,
                phone,
                order_number
            FROM orders
            WHERE id = ?
            """,
            (order_id,)
        ).fetchone()

        if not order:

            conn.close()

            return jsonify({
                "success": False,
                "message":
                    "Order not found."
            }), 404

        # =================================================
        # UPDATE STATUS
        # =================================================

        conn.execute(
            """
            UPDATE orders
            SET status = ?
            WHERE id = ?
            """,
            (
                status,
                order_id
            )
        )

        conn.commit()

        conn.close()

        # =================================================
        # LIVE DASHBOARD NOTIFICATION
        # =================================================

        broadcast_event("order_status_changed", {
            "order_id": order_id,
            "order_number": order["order_number"],
            "status": status
        })

        # =================================================
        # SEND EMAIL
        # =================================================

        send_status_update_email(

            customer_name=
                order["customer_name"],

            customer_email=
                order["email"],

            order_number=
                order["order_number"],

            status=
                status
        )

        # =================================================
        # SEND WHATSAPP STATUS UPDATE
        # =================================================

        send_whatsapp_status_update(

            customer_name=
                order["customer_name"],

            phone=
                order["phone"],

            order_number=
                order["order_number"],

            status=
                status
        )

        return jsonify({

            "success": True,

            "message":
                "Order status updated successfully."

        })

    except Exception as error:

        print(
            "UPDATE STATUS ERROR:",
            str(error),
            flush=True
        )

        return jsonify({

            "success": False,

            "message":
                "Could not update order status."

        }), 500


# =========================================================
# APPLICATION START
# =========================================================

if __name__ == "__main__":

    print(
        "==================================================",
        flush=True
    )

    print(
        "SAVORA FLASK SERVER",
        flush=True
    )

    print(
        "==================================================",
        flush=True
    )

    print(
        f"Database: {DATABASE}",
        flush=True
    )

    print(
        "Server: http://127.0.0.1:5000",
        flush=True
    )

    print(
        "Admin: http://127.0.0.1:5000/admin",
        flush=True
    )

    print(
        "==================================================",
        flush=True
    )

    app.run(
        debug=True,
        port=5000,
        use_reloader=False,
        threaded=True
    )