import "dotenv/config";
import "./bot.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { productsRouter } from "./routes/products.js";
import { gameOptionsRouter } from "./routes/game-options.js";
import { orderRouter } from "./routes/order.js";
import { yakuraRouter } from "./routes/yakura.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN
      ? [process.env.FRONTEND_ORIGIN]
      : true,
    methods: ["GET", "POST", "OPTIONS"],
  })
);

app.use(express.json({ limit: "200kb" }));
app.use(morgan("tiny"));

app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "YAKURA DONAT SHOP API",
  });
});


/*
|--------------------------------------------------------------------------
| OLD SOURCE ROUTES
|--------------------------------------------------------------------------
*/

app.use("/api/products", productsRouter);
app.use("/api/game-options", gameOptionsRouter);
app.use("/api/order", orderRouter);


/*
|--------------------------------------------------------------------------
| YAKURA MINI APP API
|--------------------------------------------------------------------------
*/

app.use("/api", yakuraRouter);


/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal server error",
  });
});


/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

const port = Number(
  process.env.PORT || 3000
);

app.listen(port, () => {
  console.log(
    `YAKURA API listening on :${port}`
  );
});
