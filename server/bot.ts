import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL || "https://rose-production-f333.up.railway.app/";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required. Set it in .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "";
  const greeting = firstName
    ? `Привет, ${firstName}! 👋`
    : "Привет! 👋";
  bot.sendMessage(
    chatId,
    greeting +
      "\n\n🌸 Заходи в мини-апп Bloom & Bliss — цветочный бутик с подарками и сюрпризами для особенных людей.\n\n" +
      "Там ты найдёшь букеты, торты, подарки к 8 Марта и возможность отправить сюрприз любимому блогеру. " +
      "Оформи заказ — мы всё красиво соберём и доставим.",
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
