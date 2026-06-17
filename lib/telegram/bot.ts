import { Telegraf } from "telegraf";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn("TELEGRAM_BOT_TOKEN is not set. Telegram features will be disabled.");
}

export const telegramBot = token ? new Telegraf(token) : null;
