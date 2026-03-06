import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL || "https://your-mini-app-url.com";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required. Set it in .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "🌸 Заходи в мини-апп и получи подарок второй половинке бесплатно!\n\n" +
      "Bloom & Bliss — цветочный бутик с подарками и сюрпризами.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть мини-апп",
              web_app: { url: appUrl },
            },
          ],
        ],
      },
    }
  );
});

console.log("Bot is running...");
