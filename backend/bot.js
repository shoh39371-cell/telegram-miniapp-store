import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { supabase } from "./supabase.js";
import { ADMIN_IDS, isAdminTelegramId } from "./telegram.js";

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
    throw new Error("Missing BOT_TOKEN");
}

const bot = new Telegraf(botToken);

const WEBAPP_URL =
    process.env.WEBAPP_URL ||
    "https://yakura-frontend.onrender.com";


/*
|--------------------------------------------------------------------------
| ADMIN TEKSHIRISH
|--------------------------------------------------------------------------
*/

function requireAdmin(ctx) {
    const fromId = ctx.from?.id;

    if (!fromId || !isAdminTelegramId(fromId)) {
        ctx.answerCbQuery?.("Not authorized").catch(() => {});
        ctx.reply?.("Not authorized.").catch(() => {});
        return false;
    }

    return true;
}


/*
|--------------------------------------------------------------------------
| /START — HAMMA FOYDALANUVCHI UCHUN
|--------------------------------------------------------------------------
*/

bot.start(async (ctx) => {

    const firstName =
        ctx.from?.first_name || "foydalanuvchi";

    await ctx.reply(
        `🌸 Salom, ${firstName}!\n\n` +
        `🌙 YAKURA DONAT SHOP\n\n` +
        `🎮 Istalgan o'yinga donat qiling.\n` +
        `⚡ Tezkor va qulay xizmat.\n\n` +
        `Quyidagi tugma orqali do'konni oching 👇`,
        Markup.inlineKeyboard([
            [
                Markup.button.webApp(
                    "🎮 DONAT SHOPNI OCHISH",
                    WEBAPP_URL
                )
            ]
        ])
    );
});


/*
|--------------------------------------------------------------------------
| CALLBACK — FAQAT ADMIN
|--------------------------------------------------------------------------
*/

bot.on("callback_query", async (ctx) => {

    if (!requireAdmin(ctx)) return;

    const data = ctx.callbackQuery?.data;

    if (typeof data !== "string") return;

    const [action, orderId] = data.split("_");

    if (!orderId) return;

    if (
        action !== "confirm" &&
        action !== "cancel"
    ) {
        return;
    }

    const newStatus =
        action === "confirm"
            ? "confirmed"
            : "cancelled";


    const { data: updated, error } =
        await supabase
            .from("orders")
            .update({
                status: newStatus
            })
            .eq("id", orderId)
            .select(
                "id,status,product_name,price,transaction_last6"
            )
            .single();


    if (error) {

        await ctx
            .answerCbQuery(
                "Failed to update order"
            )
            .catch(() => {});

        return;
    }


    await ctx
        .answerCbQuery(
            `Order ${newStatus}`
        )
        .catch(() => {});


    const text =
        `✅ Order Updated\n\n` +
        `OrderID: ${updated.id}\n` +
        `Item: ${updated.product_name}\n` +
        `Price: ${updated.price} so'm\n` +
        `Transaction: ${updated.transaction_last6}\n` +
        `Status: ${updated.status}`;


    try {

        await ctx.editMessageText(
            text,
            {
                reply_markup: {
                    inline_keyboard: []
                }
            }
        );

    } catch {

        await ctx.reply(text);
    }
});


/*
|--------------------------------------------------------------------------
| BOT XATOLARI
|--------------------------------------------------------------------------
*/

bot.catch((err) => {
    console.error(
        "Bot error:",
        err
    );
});


/*
|--------------------------------------------------------------------------
| BOT START
|--------------------------------------------------------------------------
*/

bot.launch()
    .then(() => {
        console.log(
            "YAKURA Telegram bot launched"
        );

        console.log(
            "Mini App:",
            WEBAPP_URL
        );
    });


/*
|--------------------------------------------------------------------------
| STOP
|--------------------------------------------------------------------------
*/

process.once(
    "SIGINT",
    () => bot.stop("SIGINT")
);

process.once(
    "SIGTERM",
    () => bot.stop("SIGTERM")
);
