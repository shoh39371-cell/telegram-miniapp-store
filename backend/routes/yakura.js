import express from "express";
import { supabase } from "../supabase.js";

export const yakuraRouter = express.Router();

const PLAYPAY_URL = "https://playpay.uz/api/v1";

async function playpay(path, options = {}) {
    const key = process.env.PLAYPAY_API_KEY;

    if (!key) {
        throw new Error("PLAYPAY_API_KEY is missing");
    }

    const response = await fetch(`${PLAYPAY_URL}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-API-Key": key,
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data?.error ||
            data?.message ||
            `PlayPay error: ${response.status}`
        );
    }

    return data;
}


/*
|--------------------------------------------------------------------------
| O'YINLAR — PLAYPAY'DAN BARCHASI
|--------------------------------------------------------------------------
*/

yakuraRouter.get("/games", async (_req, res) => {
    try {
        const data = await playpay("/games");

        const games = Array.isArray(data?.games)
            ? data.games
            : Array.isArray(data)
                ? data
                : [];

        const result = games.map((game) => ({
            id: game.game_id,
            game_id: game.game_id,

            name: game.name,
            title: game.name,
            game_name: game.name,

            id_label: game.id_label || "Player ID",

            requires_server: Boolean(game.requires_server),
            requires_charname: Boolean(game.requires_charname),

            amount_based: Boolean(game.amount_based),
            packages_count: Number(game.packages_count || 0),

            // Frontend uchun fallback
            image_url: game.image_url || "",
            icon: game.icon || ""
        }));

        return res.json(result);

    } catch (error) {
        console.error("Games error:", error.message);

        return res.status(500).json({
            error: "O'yinlarni yuklab bo'lmadi",
            details: error.message
        });
    }
});


/*
|--------------------------------------------------------------------------
| O'YIN PAKETLARI
|--------------------------------------------------------------------------
*/

yakuraRouter.get("/games/:gameId/packages", async (req, res) => {
    try {
        const gameId = Number(req.params.gameId);

        if (!Number.isInteger(gameId)) {
            return res.status(400).json({
                error: "Noto'g'ri game ID"
            });
        }

        const data = await playpay(
            `/games/${encodeURIComponent(gameId)}/packages?currency=UZS`
        );

        const packages = Array.isArray(data?.packages)
            ? data.packages
            : Array.isArray(data)
                ? data
                : [];

        const result = packages.map((item) => {
            const charged = Number(
                item?.charged?.amount ??
                item?.price?.amount ??
                item?.price ??
                0
            );

            const markupRate =
                charged < 50000 ? 0.05 : 0.08;

            const markupAmount = Math.round(
                charged * markupRate
            );

            const customerPrice =
                charged + markupAmount;

            return {
                id: item.paket_id,
                paket_id: item.paket_id,

                name: item.name,

                base_price: charged,

                markup_percent:
                    markupRate * 100,

                markup_amount:
                    markupAmount,

                price: customerPrice,

                charged: charged,

                currency: "UZS"
            };
        });

        return res.json(result);

    } catch (error) {
        console.error(
            "Packages error:",
            error.message
        );

        return res.status(500).json({
            error: "Paketlarni yuklab bo'lmadi",
            details: error.message
        });
    }
});


/*
|--------------------------------------------------------------------------
| PLAYER TEKSHIRISH
|--------------------------------------------------------------------------
*/

yakuraRouter.post("/check-player", async (req, res) => {
    try {
        const {
            game_id,
            player_id,
            server_id,
            charname
        } = req.body || {};

        if (!game_id) {
            return res.status(400).json({
                success: false,
                error: "game_id kerak"
            });
        }

        if (!player_id) {
            return res.status(400).json({
                success: false,
                error: "player_id kerak"
            });
        }

        const body = {
            game_id: Number(game_id),
            player_id: String(player_id)
        };

        if (server_id) {
            body.server_id = String(server_id);
        }

        if (charname) {
            body.charname = String(charname);
        }

        const data = await playpay("/check_id", {
            method: "POST",
            body: JSON.stringify(body)
        });

        if (data?.valid === false) {
            return res.json({
                success: false,
                valid: false,
                player_name: "",
                data
            });
        }

        return res.json({
            success: true,
            valid: true,

            player_name:
                data?.player_name ||
                data?.nickname ||
                data?.name ||
                "",

            data
        });

    } catch (error) {
        console.error("Player check error:", error.message);

        return res.status(400).json({
            success: false,
            valid: false,
            error: error.message
        });
    }
});


/*
|--------------------------------------------------------------------------
| BUYURTMA
|--------------------------------------------------------------------------
*/

yakuraRouter.post("/create-order", async (req, res) => {
    try {
        const {
            game_id,
            package_id,
            paket_id,
            player_id,
            server_id,
            charname,
            telegram_user_id
        } = req.body || {};

        const finalPackageId = package_id || paket_id;

        if (!game_id || !finalPackageId || !player_id) {
            return res.status(400).json({
                success: false,
                error: "Buyurtma ma'lumotlari to'liq emas"
            });
        }

        const orderData = {
            game_id: Number(game_id),
            paket_id: Number(finalPackageId),
            player_id: String(player_id)
        };

        if (server_id) {
            orderData.server_id = String(server_id);
        }

        if (charname) {
            orderData.charname = String(charname);
        }

        const result = await playpay("/order", {
            method: "POST",
            body: JSON.stringify(orderData)
        });

        /*
        |------------------------------------------------------------------
        | Supabase'ga saqlash
        |------------------------------------------------------------------
        */

        try {
            await supabase
                .from("orders")
                .insert({
                    telegram_id: telegram_user_id
                        ? String(telegram_user_id)
                        : "unknown",

                    product_name:
                        `Game ${game_id} / Package ${finalPackageId}`,

                    amount: String(finalPackageId),

                    price:
                        Number(
                            result?.price?.amount ||
                            0
                        ),

                    transaction_last6: "000000",

                    status: "pending"
                });
        } catch (dbError) {
            console.error(
                "Order DB error:",
                dbError.message
            );
        }

        return res.json({
            success: true,

            order_id:
                result?.order_id ||
                result?.id ||
                null,

            status:
                result?.status ||
                "processing",

            player_name:
                result?.player_name ||
                "",

            price:
                result?.price?.amount ||
                0,

            charged:
                result?.charged?.amount ||
                0,

            order: result
        });

    } catch (error) {
        console.error(
            "Create order error:",
            error.message
        );

        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
});
/*
|--------------------------------------------------------------------------
| BUYURTMALARIM
|--------------------------------------------------------------------------
*/

yakuraRouter.get("/orders", async (req, res) => {
    try {
        const telegramUserId = String(
            req.query.telegram_user_id || ""
        ).trim();

        if (!telegramUserId) {
            return res.status(400).json({
                success: false,
                error: "telegram_user_id kerak"
            });
        }

        const { data, error } = await supabase
            .from("orders")
            .select(`
                id,
                product_name,
                amount,
                price,
                status,
                created_at
            `)
            .eq("telegram_id", telegramUserId)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error(
                "Orders fetch error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                error: "Buyurtmalarni yuklab bo'lmadi"
            });
        }

        return res.json({
            success: true,
            orders: data || []
        });

    } catch (error) {
        console.error(
            "Orders error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "Server xatosi"
        });
    }
});
/*
|--------------------------------------------------------------------------
| FOYDALANUVCHI BUYURTMALARI
|--------------------------------------------------------------------------
*/

yakuraRouter.get("/my-orders/:telegramId", async (req, res) => {
    try {
        const telegramId = String(
            req.params.telegramId || ""
        ).trim();

        if (!telegramId) {
            return res.status(400).json({
                success: false,
                error: "Telegram ID kerak"
            });
        }

        const { data, error } = await supabase
            .from("orders")
            .select(
                "id, product_name, amount, price, status, created_at"
            )
            .eq("telegram_id", telegramId)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error(
                "My orders DB error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                error: "Buyurtmalarni yuklab bo'lmadi"
            });
        }

        return res.json({
            success: true,
            orders: data || []
        });

    } catch (error) {
        console.error(
            "My orders error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "Buyurtmalarni yuklab bo'lmadi"
        });
    }
});
/*
|--------------------------------------------------------------------------
| PLAYPAY BALANCE
|--------------------------------------------------------------------------
*/

yakuraRouter.get("/playpay-balance", async (_req, res) => {
    try {
        const data = await playpay("/balance");

        return res.json(data);

    } catch (error) {
        console.error(
            "PlayPay balance error:",
            error.message
        );

        return res.status(500).json({
            error: error.message
        });
    }
});
