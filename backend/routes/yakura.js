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
            "Content-Type": "application/json",
            "X-API-Key": key,
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `PlayPay error: ${response.status}`
        );
    }

    return data;
}


/*
|--------------------------------------------------------------------------
| O'YINLAR
|--------------------------------------------------------------------------
*/

yakuraRouter.get("/games", async (_req, res) => {
    try {
        const data = await playpay("/games");

        const games =
            data?.games ||
            data?.data ||
            (Array.isArray(data) ? data : []);

        return res.json(games);

    } catch (error) {
        console.error("Games error:", error.message);

        return res.status(500).json({
            error: "O'yinlarni yuklab bo'lmadi"
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
        const data = await playpay(
            `/games/${encodeURIComponent(req.params.gameId)}/packages`
        );

        const packages =
            data?.packages ||
            data?.data ||
            (Array.isArray(data) ? data : []);

        return res.json(packages);

    } catch (error) {
        console.error("Packages error:", error.message);

        return res.status(500).json({
            error: "Paketlarni yuklab bo'lmadi"
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
            server_id
        } = req.body || {};

        if (!game_id) {
            return res.status(400).json({
                error: "game_id kerak"
            });
        }

        if (!player_id) {
            return res.status(400).json({
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

        const data = await playpay("/check_id", {
            method: "POST",
            body: JSON.stringify(body)
        });

        return res.json({
            success: true,
            player_name:
                data?.player_name ||
                data?.nickname ||
                data?.name ||
                data?.data?.player_name ||
                "Akkaunt topildi",
            data
        });

    } catch (error) {
        console.error("Player check error:", error.message);

        return res.status(400).json({
            success: false,
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
            player_id,
            server_id,
            telegram_user_id
        } = req.body || {};

        if (!game_id || !package_id || !player_id) {
            return res.status(400).json({
                error: "Buyurtma ma'lumotlari to'liq emas"
            });
        }

        /*
         * PlayPay order.
         */
        const orderData = {
            game_id: Number(game_id),
            package_id: Number(package_id),
            player_id: String(player_id)
        };

        if (server_id) {
            orderData.server_id = String(server_id);
        }

        const result = await playpay("/order", {
            method: "POST",
            body: JSON.stringify(orderData)
        });

        /*
         * Agar Supabase mavjud bo'lsa,
         * buyurtmani ham saqlaymiz.
         */
        try {
            await supabase
                .from("orders")
                .insert({
                    telegram_id: telegram_user_id
                        ? String(telegram_user_id)
                        : "unknown",
                    product_name:
                        `Game ${game_id} / Package ${package_id}`,
                    amount: String(package_id),
                    price: 0,
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
            message: "Buyurtma qabul qilindi",
            order: result
        });

    } catch (error) {
        console.error("Create order error:", error.message);

        return res.status(400).json({
            success: false,
            error: error.message
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
