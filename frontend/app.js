const API = "https://yakura.onrender.com/api";

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

let games = [];
let selectedGame = null;
let selectedPackage = null;


/* =========================
   ELEMENTLAR
========================= */

const gamesContainer = document.getElementById("gamesContainer");
const searchInput = document.getElementById("searchInput");

const gameModal = document.getElementById("gameModal");
const closeGameModal = document.getElementById("closeGameModal");

const selectedGameIcon = document.getElementById("selectedGameIcon");
const selectedGameName = document.getElementById("selectedGameName");

const playerId = document.getElementById("playerId");
const serverId = document.getElementById("serverId");
const serverField = document.getElementById("serverField");

const checkPlayerButton = document.getElementById("checkPlayerButton");
const playerResult = document.getElementById("playerResult");

const packagesContainer =
    document.getElementById("packagesContainer");

const packagesList =
    document.getElementById("packagesList");

const errorBox =
    document.getElementById("errorBox");


/* =========================
   YUKLASH
========================= */

async function loadGames() {

    try {

        showLoading();

        const response =
            await fetch(`${API}/games`);

        if (!response.ok) {
            throw new Error("O'yinlarni yuklab bo'lmadi");
        }

        const data =
            await response.json();

        games =
            Array.isArray(data)
                ? data
                : data.games ||
                  data.data ||
                  [];

        renderGames(games);

    } catch (error) {

        console.error(error);

        showError(
            "O'yinlarni yuklashda xatolik."
        );
    }
}


/* =========================
   O'YINLARNI CHIQARISH
========================= */

function renderGames(list) {
    if (!gamesContainer) return;

    if (!list.length) {
        gamesContainer.innerHTML = `
            <div class="loading-card">
                O'yinlar topilmadi.
            </div>
        `;
        return;
    }

    gamesContainer.innerHTML = list.map((game, index) => {
        const id =
            game.id ??
            game.game_id ??
            game.code ??
            index;

        const name =
            game.name ??
            game.title ??
            game.game_name ??
            "O'yin";

        const image =
            game.image_url ??
            game.image ??
            game.icon ??
            "";

        return `
            <button
                class="game-card"
                data-game-id="${escapeHtml(String(id))}"
            >

                <div class="game-icon">
                    ${
                        image
                            ? `<img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(name)}"
                                loading="lazy"
                              >`
                            : `<span>🎮</span>`
                    }
                </div>

                <div class="game-info">
                    <strong>${escapeHtml(name)}</strong>
                    <small>Donat qilish</small>
                </div>

                <span class="game-arrow">›</span>

            </button>
        `;
    }).join("");

    document.querySelectorAll(".game-card").forEach(card => {
        card.addEventListener("click", () => {
            const id = card.dataset.gameId;

            const game = games.find(g =>
                String(
                    g.id ??
                    g.game_id ??
                    g.code
                ) === String(id)
            );

            if (game) openGame(game);
        });
    });
}


/* =========================
   O'YIN OCHISH
========================= */

async function openGame(game) {

    selectedGame = game;

    const name =
        game.name ??
        game.title ??
        game.game_name ??
        "O'yin";

    const icon =
        game.icon ??
        game.image ??
        game.logo ??
        "🎮";

    selectedGameName.textContent =
        name;

    if (String(icon).startsWith("http")) {

        selectedGameIcon.innerHTML =
            `<img src="${escapeHtml(icon)}" alt="">`;

    } else {

        selectedGameIcon.textContent =
            icon;
    }

    playerId.value = "";
    serverId.value = "";

    playerResult.classList.add("hidden");
    packagesContainer.classList.add("hidden");

    /*
     * MLBB va server kerak bo'ladigan
     * o'yinlar uchun server maydoni.
     */

    const gameName =
        name.toLowerCase();

    if (
        gameName.includes("mobile legends") ||
        gameName.includes("mlbb") ||
        gameName.includes("mobile legend")
    ) {

        serverField.style.display = "block";

    } else {

        serverField.style.display = "none";
    }

    gameModal.classList.remove("hidden");

    await loadPackages(game);
}


/* =========================
   PAKETLAR
========================= */

async function loadPackages(game) {

    try {

        packagesList.innerHTML = `
            <div class="loading-card">
                Paketlar yuklanmoqda...
            </div>
        `;

        const gameId =
            game.id ??
            game.game_id ??
            game.code;

        const response =
            await fetch(
                `${API}/games/${encodeURIComponent(gameId)}/packages`
            );

        if (!response.ok) {
            throw new Error(
                "Paketlarni yuklab bo'lmadi"
            );
        }

        const data =
            await response.json();

        const packages =
            Array.isArray(data)
                ? data
                : data.packages ||
                  data.data ||
                  [];

        renderPackages(packages);

    } catch (error) {

        console.error(error);

        packagesList.innerHTML = `
            <div class="loading-card">
                Paketlar hozircha mavjud emas.
            </div>
        `;
    }
}


/* =========================
   PAKET CHIQARISH
========================= */

function renderPackages(packages) {

    packagesContainer.classList.remove("hidden");

    if (!packages.length) {

        packagesList.innerHTML = `
            <div class="loading-card">
                Paketlar topilmadi.
            </div>
        `;

        return;
    }

    packagesList.innerHTML =
        packages.map((item, index) => {

            const id =
                item.id ??
                item.package_id ??
                item.code ??
                index;

            const name =
                item.name ??
                item.title ??
                item.package_name ??
                item.amount ??
                "Paket";

            const price =
                item.price ??
                item.amount_price ??
                item.cost ??
                0;

            const formattedPrice =
                formatPrice(price);

            return `
                <button
                    class="package-card"
                    data-package-id="${escapeHtml(String(id))}"
                >

                    <div>
                        <strong>
                            ${escapeHtml(String(name))}
                        </strong>

                        <small>
                            ${formattedPrice} so'm
                        </small>
                    </div>

                    <span>
                        Sotib olish
                    </span>

                </button>
            `;

        }).join("");

    document
        .querySelectorAll(".package-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const packageId =
                        card.dataset.packageId;

                    const gameId =
                        selectedGame.id ??
                        selectedGame.game_id ??
                        selectedGame.code;

                    selectedPackage = {
                        id: packageId,
                        game_id: gameId
                    };

                    document
                        .querySelectorAll(".package-card")
                        .forEach(x =>
                            x.classList.remove("selected")
                        );

                    card.classList.add("selected");

                    document
                        .getElementById("playerId")
                        ?.focus();
                }
            );

        });
}


/* =========================
   PLAYER TEKSHIRISH
========================= */

checkPlayerButton.addEventListener(
    "click",
    async () => {

        if (!selectedGame) {
            return;
        }

        const pid =
            playerId.value.trim();

        const sid =
            serverId.value.trim();

        if (!pid) {

            showError(
                "Player ID kiriting."
            );

            playerId.focus();

            return;
        }

        checkPlayerButton.disabled = true;

        checkPlayerButton.textContent =
            "⏳ Tekshirilmoqda...";

        try {

            const gameId =
                selectedGame.id ??
                selectedGame.game_id ??
                selectedGame.code;

            const response =
                await fetch(
                    `${API}/check-player`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            game_id: gameId,
                            player_id: pid,
                            server_id: sid || undefined
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok ||
                data.success === false) {

                throw new Error(
                    data.error ||
                    "Player topilmadi"
                );
            }

            playerResult.innerHTML = `
                <div>
                    ✅ <strong>Akkaunt topildi</strong>
                </div>

                <div>
                    👤 ${
                        escapeHtml(
                            data.player_name ||
                            "Nickname aniqlanmadi"
                        )
                    }
                </div>
            `;

            playerResult.classList.remove(
                "hidden"
            );

            packagesContainer.classList.remove(
                "hidden"
            );

        } catch (error) {

            showError(
                error.message ||
                "Player ID tekshirishda xatolik."
            );

        } finally {

            checkPlayerButton.disabled = false;

            checkPlayerButton.textContent =
                "🔎 Akkauntni tekshirish";
        }
    }
);


/* =========================
   PAKET BUYURTMA
========================= */

document.addEventListener(
    "click",
    async event => {

        const card =
            event.target.closest(
                ".package-card"
            );

        if (!card || !selectedGame) {
            return;
        }

        const packageId =
            card.dataset.packageId;

        const pid =
            playerId.value.trim();

        const sid =
            serverId.value.trim();

        if (!pid) {

            showError(
                "Avval Player ID kiriting."
            );

            return;
        }

        const confirmed =
            confirm(
                "Ushbu paketni sotib olishni tasdiqlaysizmi?"
            );

        if (!confirmed) {
            return;
        }

        card.disabled = true;

        try {

            const gameId =
                selectedGame.id ??
                selectedGame.game_id ??
                selectedGame.code;

            const telegramUserId =
                tg?.initDataUnsafe
                    ?.user
                    ?.id || null;

            const response =
                await fetch(
                    `${API}/create-order`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            game_id: gameId,

                            package_id:
                                packageId,

                            player_id:
                                pid,

                            server_id:
                                sid || undefined,

                            telegram_user_id:
                                telegramUserId
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok ||
                data.success === false) {

                throw new Error(
                    data.error ||
                    "Buyurtma yaratilmadi"
                );
            }

            alert(
                "✅ Buyurtma qabul qilindi!"
            );

            closeModal();

        } catch (error) {

            showError(
                error.message ||
                "Buyurtma yuborishda xatolik."
            );

        } finally {

            card.disabled = false;
        }
    }
);


/* =========================
   SEARCH
========================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value
                    .trim()
                    .toLowerCase();

            const filtered =
                games.filter(game => {

                    const name =
                        game.name ??
                        game.title ??
                        game.game_name ??
                        "";

                    return String(name)
                        .toLowerCase()
                        .includes(query);
                });

            renderGames(filtered);
        }
    );
}


/* =========================
   MODAL
========================= */

closeGameModal?.addEventListener(
    "click",
    closeModal
);

document
    .querySelector(".modal-backdrop")
    ?.addEventListener(
        "click",
        closeModal
    );

function closeModal() {

    gameModal.classList.add(
        "hidden"
    );

    selectedGame = null;
    selectedPackage = null;
}


/* =========================
   QUICK BUTTONS
========================= */

document
    .getElementById("supportButton")
    ?.addEventListener(
        "click",
        () => {

            const username =
                "Shohjaxono1";

            if (tg) {
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
    );


document
    .getElementById("profileButton")
    ?.addEventListener(
        "click",
        () => {

            alert(
                "Profil bo'limi tez orada ishga tushadi."
            );
        }
    );


document
    .getElementById("profileMenuButton")
    ?.addEventListener(
        "click",
        () => {

            alert(
                "Profil bo'limi tez orada ishga tushadi."
            );
        }
    );


async function showMyOrders() {

    const telegramUserId =
        tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
        alert(
            "Telegram foydalanuvchisi aniqlanmadi."
        );
        return;
    }

    try {

        const response = await fetch(
            `${API}/my-orders/${telegramUserId}`
        );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Buyurtmalarni yuklab bo'lmadi"
            );
        }

        const orders =
            data.orders || [];

        if (!orders.length) {
            alert(
                "Sizda hali buyurtmalar mavjud emas."
            );
            return;
        }

        const text =
            orders.map(
                (order, index) => {

                    return `${index + 1}. ${order.product_name}
💰 ${formatPrice(order.price)} so'm
📌 ${order.status}`;
                }
            ).join("\n\n");

        alert(text);

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Buyurtmalarni yuklashda xatolik."
        );
    }
}


document
    .getElementById("ordersButton")
    ?.addEventListener(
        "click",
        showMyOrders
    );


document
    .getElementById("ordersNav")
    ?.addEventListener(
        "click",
        showMyOrders
    );


document
    .getElementById("promoButton")
    ?.addEventListener(
        "click",
        () => {

            alert(
                "Promokod bo'limi tez orada ishga tushadi."
            );
        }
    );


document
    .getElementById("balanceButton")
    ?.addEventListener(
        "click",
        () => {

            alert(
                "Balans to'ldirish bo'limi keyingi bosqichda ulanadi."
            );
        }
    );


document
    .getElementById("balanceNav")
    ?.addEventListener(
        "click",
        () => {

            alert(
                "Balans bo'limi keyingi bosqichda ulanadi."
            );
        }
    );


/* =========================
   YORDAMCHI
========================= */

function showLoading() {

    gamesContainer.innerHTML = `
        <div class="loading-card">

            <div class="loader"></div>

            <span>
                O'yinlar yuklanmoqda...
            </span>

        </div>
    `;
}


function showError(message) {

    if (!errorBox) {
        alert(message);
        return;
    }

    errorBox.textContent =
        message;

    errorBox.classList.remove(
        "hidden"
    );

    setTimeout(() => {

        errorBox.classList.add(
            "hidden"
        );

    }, 4000);
}


function formatPrice(price) {

    const number =
        Number(
            String(price)
                .replace(/[^\d.]/g, "")
        );

    if (!Number.isFinite(number)) {
        return String(price);
    }

    return Math.round(number)
        .toLocaleString("uz-UZ");
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================
   START
========================= */

loadGames();
