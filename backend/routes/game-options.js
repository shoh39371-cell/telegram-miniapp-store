import express from "express";
import { supabase } from "../supabase.js";

export const gameOptionsRouter = express.Router();

gameOptionsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("game_options")
    .select(`
      id,
      game_name,
      amount,
      price,
      image_url,
      server_required
    `)
    .order("game_name", { ascending: true })
    .order("price", { ascending: true });

  if (error) {
    console.error("game_options error:", error);
    return res.status(500).json({
      error: "Failed to load game options"
    });
  }

  return res.json({
    options: data ?? []
  });
});
