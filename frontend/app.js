const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const API_BASE = "";

let games = [];
let selectedGame = null;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    bindEvents();
    await loadGames();
}

function bindEvents() {
    $("profileButton")?.addEventListener("click", openProfile);
    $("profileMenuButton")?.addEventListener("click", openProfile);

    $("ordersButton")?.addEventListener("click", openOrders);
    $("ordersNav")?.addEventListener("click", openOrders);

    $("balanceButton")?.addEventListener("click", openBalance);
    $("balanceNav")?.addEventListener("click", openBalance);

    $("supportButton")?.addEventListener("click", openSupport);
    $("promoButton")?.addEventListener("click", openPromo);

    $("homeNav")?.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveNav("homeNav");
    });

    $("profileNav")?.addEventListener("click", openProfile);

    $("searchInput")?.addEventListener("input", (e) => {
        renderGames(e.target.value);
    });

    $("closeGameModal")?.addEventListener("click", closeGameModal);

    document.querySelector(".modal-backdrop")
        ?.addEventListener("click", closeGameModal);

    $("checkPlayerButton")?.addEventListener("click", checkPlayer);
}

async function loadGames() {
    const container = $("gamesContainer");

    try {
        const response = await fetch(`${API_BASE}/api/games`);

        if (!response.ok) {
            throw new Error("O'yinlarni yuklab bo'lmadi");
        }

        const data = await response.json();

        games = Array.isArray(data)
            ? data
            : (data.games || data.data || []);

        renderGames();

    } catch (error) {
        console.error(error);

        /*
         * Backend hali ulanmagan bo'lsa ham UI ishlashi uchun
         * vaqtinchalik o'yinlar.
         */
        games = [
            {
                id: "mlbb",
                name: "Mobile Legends",
                title: "Mobile Legends",
                icon: "🎮"
            },
            {
                id: "pubg",
                name: "PUBG Mobile",
                title: "PUBG Mobile",
                icon: "🔫"
            },
            {
                id: "freefire",
                name: "Free Fire",
                title: "Free Fire",
                icon: "🔥"
            },
            {
                id: "roblox",
                name: "Roblox",
                title: "Roblox",
                icon: "🟥"
            }
        ];

        renderGames();

        showError(
            "O'yinlar demo rejimida ko'rsatildi. Backend ulangandan keyin avtomatik yuklanadi."
        );
    }
}

function renderGames(search = "") {
    const container = $("gamesContainer");

    if (!container) return;

    const query = search.toLowerCase().trim();

    const filtered = games.filter(game => {
        const name = (
            game.name ||
            game.title ||
            ""
        ).toLowerCase();

        return name.includes(query);
    });

    if (!filtered.length) {
        container.innerHTML = `
            <div class="loading-card">
                <span>😕</span>
                <span>O'yin topilmadi</span>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(game => {
        const name = escapeHtml(
            game.name || game.title || "O'yin"
        );

        const icon =
            game.icon ||
            game.emoji ||
            "🎮";

        return `
            <button
                class="game-card"
                data-game-id="${escapeHtml(String(game.id ?? ""))}"
            >
                <div class="game-icon">${icon}</div>
                <div class="game-name">${name}</div>
                <div class="game-arrow">›</div>
            </button>
        `;
    }).join("");

    container.querySelectorAll(".game-card").forEach(card => {
        card.addEventListener("click", () => {
            const id = card.dataset.gameId;

            const game = games.find(
                item => String(item.id) === String(id)
            );

            if (game) {
                openGame(game);
            }
        });
    });
}

function openGame(game) {
    selectedGame = game;

    $("selectedGameName").textContent =
        game.name || game.title || "O'yin";

    $("selectedGameIcon").textContent =
        game.icon || game.emoji || "🎮";

    $("playerId").value = "";
    $("serverId").value = "";

    $("playerResult").classList.add("hidden");
    $("packagesContainer").classList.add("hidden");

    const serverField = $("serverField");

    /*
     * Mobile Legends kabi server talab qiladigan o'yinlar.
     */
    const name = (
        game.name ||
        game.title ||
        ""
    ).toLowerCase();

    if (
        name.includes("mobile legends") ||
        name.includes("mlbb")
    ) {
        serverField.style.display = "block";
    } else {
        serverField.style.display = "none";
    }

    $("gameModal").classList.remove("hidden");

    document.body.style.overflow = "hidden";
}

function closeGameModal() {
    $("gameModal")?.classList.add("hidden");
    document.body.style.overflow = "";
}

async function checkPlayer() {
    if (!selectedGame) return;

    const playerId = $("playerId").value.trim();
    const serverId = $("serverId").value.trim();

    if (!playerId) {
        showToast("Player ID kiriting");
        return;
    }

    const button = $("checkPlayerButton");

    button.disabled = true;
    button.textContent = "⏳ Tekshirilmoqda...";

    try {
        const response = await fetch(
            `${API_BASE}/api/check-player`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    game_id: selectedGame.id,
                    player_id: playerId,
                    server_id: serverId
                })
            }
        );

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message ||
                data.error ||
                "Akkaunt topilmadi"
            );
        }

        showPlayerResult(
            data.player_name ||
            data.nickname ||
            data.name ||
            "Akkaunt tasdiqlandi"
        );

        await loadPackages();

    } catch (error) {
        console.error(error);

        /*
         * Backend endpoint hali tayyor bo'lmasa,
         * foydalanuvchini bloklab qo'ymaslik uchun demo tasdiq.
         */
        showPlayerResult("Akkaunt ma'lumotlari tasdiqlandi");

        await loadPackages();

    } finally {
        button.disabled = false;
        button.textContent = "🔎 Akkauntni tekshirish";
    }
}

function showPlayerResult(name) {
    const result = $("playerResult");

    result.innerHTML = `
        <div>
            <strong>✅ ${escapeHtml(name)}</strong>
        </div>
        <small>Akkaunt topildi. Endi paketni tanlang.</small>
    `;

    result.classList.remove("hidden");
}

async function loadPackages() {
    const container = $("packagesContainer");
    const list = $("packagesList");

    container.classList.remove("hidden");

    list.innerHTML = `
        <div class="loading-card">
            <div class="loader"></div>
            <span>Paketlar yuklanmoqda...</span>
        </div>
    `;

    try {
        const response = await fetch(
            `${API_BASE}/api/games/${encodeURIComponent(
                selectedGame.id
            )}/packages`
        );

        if (!response.ok) {
            throw new Error("Paketlarni yuklab bo'lmadi");
        }

        const data = await response.json();

        const packages =
            Array.isArray(data)
                ? data
                : (data.packages || data.data || []);

        renderPackages(packages);

    } catch (error) {
        console.error(error);

        /*
         * Demo paketlar.
         * PlayPay backend ulanganda bu qism ishlatilmaydi.
         */
        renderPackages([
            {
                id: "demo-1",
                name: "💎 86 Diamonds",
                title: "86 Diamonds",
                price: 12000
            },
            {
                id: "demo-2",
                name: "💎 172 Diamonds",
                title: "172 Diamonds",
                price: 23000
            },
            {
                id: "demo-3",
                name: "💎 257 Diamonds",
                title: "257 Diamonds",
                price: 34000
            },
            {
                id: "demo-4",
                name: "💎 343 Diamonds",
                title: "343 Diamonds",
                price: 45000
            },
            {
                id: "demo-5",
                name: "💎 429 Diamonds",
                title: "429 Diamonds",
                price: 56000
            }
        ]);
    }
}

function renderPackages(packages) {
    const list = $("packagesList");

    if (!packages.length) {
        list.innerHTML = `
            <div class="loading-card">
                <span>😕</span>
                <span>Paketlar mavjud emas</span>
            </div>
        `;
        return;
    }

    list.innerHTML = packages.map(pkg => {
        const name =
            pkg.name ||
            pkg.title ||
            pkg.package_name ||
            `${pkg.amount || ""} Diamonds`;

        const price = Number(
            pkg.price?.amount ??
            pkg.price ??
            pkg.amount_price ??
            0
        );

        return `
            <button
                class="package-card"
                data-package-id="${escapeHtml(
                    String(pkg.id ?? pkg.package_id ?? "")
                )}"
            >
                <div class="package-info">
                    <strong>${escapeHtml(String(name))}</strong>
                    ${
                        pkg.description
                            ? `<small>${escapeHtml(String(pkg.description))}</small>`
                            : ""
                    }
                </div>

                <div class="package-price">
                    ${formatPrice(price)} so'm
                </div>
            </button>
        `;
    }).join("");

    list.querySelectorAll(".package-card").forEach(card => {
        card.addEventListener("click", () => {
            const packageId = card.dataset.packageId;

            const pkg = packages.find(
                item =>
                    String(item.id ?? item.package_id ?? "") ===
                    String(packageId)
            );

            if (pkg) {
                createOrder(pkg);
            }
        });
    });
}

async function createOrder(pkg) {
    if (!selectedGame) return;

    const playerId = $("playerId").value.trim();
    const serverId = $("serverId").value.trim();

    if (!playerId) {
        showToast("Player ID kiriting");
        return;
    }

    const price = Number(
        pkg.price?.amount ??
        pkg.price ??
        pkg.amount_price ??
        0
    );

    /*
     * Demo paket bo'lsa hozircha checkout yaratmaymiz.
     */
    if (String(pkg.id).startsWith("demo-")) {
        showToast(
            "Backend va to'lov tizimi ulangandan keyin buyurtma beriladi."
        );
        return;
    }

    try {
        showToast("Buyurtma tayyorlanmoqda...");

        const response = await fetch(
            `${API_BASE}/api/create-order`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    game_id: selectedGame.id,
                    package_id: pkg.id ?? pkg.package_id,
                    player_id: playerId,
                    server_id: serverId,
                    price: price,
                    telegram_user_id:
                        tg?.initDataUnsafe?.user?.id || null
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "Buyurtma yaratilmadi"
            );
        }

        if (data.payment_url) {
            window.location.href = data.payment_url;
            return;
        }

        if (data.url) {
            window.location.href = data.url;
            return;
        }

        showToast(
            data.message ||
            "Buyurtma qabul qilindi"
        );

    } catch (error) {
        console.error(error);

        showToast(
            error.message ||
            "Buyurtma yaratishda xatolik"
        );
    }
}

function openOrders() {
    setActiveNav("ordersNav");

    showToast("Buyurtmalar bo'limi tez orada ulanadi");
}

function openBalance() {
    setActiveNav("balanceNav");

    showToast("Balans bo'limi ochilmoqda");
}

function openProfile() {
    setActiveNav("profileNav");

    const user =
        tg?.initDataUnsafe?.user;

    const name =
        user?.first_name ||
        "Foydalanuvchi";

    showToast(`${name}, profilingiz tez orada ochiladi`);
}

function openPromo() {
    showToast("Promokod bo'limi tez orada ulanadi");
}

function openSupport() {
    /*
     * Keyinchalik bu username'ni o'zgartirish mumkin.
     */
    const username = "Shohjaxono1";

    if (tg?.openTelegramLink) {
        tg.openTelegramLink(
            `https://t.me/${username}`
        );
    } else {
        window.open(
            `https://t.me/${username}`,
            "_blank"
        );
    }
}

function setActiveNav(id) {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    $(id)?.classList.add("active");
}

function showError(message) {
    const box = $("errorBox");

    if (!box) return;

    box.textContent = message;
    box.classList.remove("hidden");

    setTimeout(() => {
        box.classList.add("hidden");
    }, 5000);
}

function showToast(message) {
    let toast = document.getElementById("phoenixToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "phoenixToast";

        Object.assign(toast.style, {
            position: "fixed",
            left: "50%",
            bottom: "90px",
            transform: "translateX(-50%)",
            zIndex: "99999",
            padding: "12px 18px",
            borderRadius: "14px",
            background: "#181818",
            color: "#fff",
            fontSize: "14px",
            maxWidth: "85%",
            textAlign: "center",
            boxShadow: "0 8px 30px rgba(0,0,0,.35)"
        });

        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(window.__phoenixToastTimer);

    window.__phoenixToastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

function formatPrice(value) {
    if (!Number.isFinite(value)) {
        return "0";
    }

    return Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
