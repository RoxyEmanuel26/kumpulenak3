"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramBot = void 0;
const telegraf_1 = require("telegraf");
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. Telegram features will be disabled.");
}
exports.telegramBot = token ? new telegraf_1.Telegraf(token) : null;
