import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL || "https://rose-production-f333.up.railway.app/";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required. Set it in .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const welcomeText =
  `Приветствуем вас в Rose Bloom! 🌹🎁

Наш бот создан для того, чтобы сделать ваши праздники еще ярче и радостнее. Здесь вы можете легко подарить или получить подарок на любой праздник, а также заработать баллы за приглашение друзей!

Как это работает:
1. Пригласите своих друзей в Rose Bloom.
2. Если ваш друг закажет подарок, вы получите баллы.
3. Накопленные баллы можно обменять на подарки для других!

Давайте сделаем каждый праздник особенным вместе! 🎉✨`;

bot.onText(/\/start/, (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const siteUrl = appUrl.replace(/\/$/, "");
  const webAppUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  bot
    .sendMessage(chatId, welcomeText, {
      reply_markup: {
        inline_keyboard: [[{ text: "Подарить подарок", web_app: { url: webAppUrl } }]],
      },
    })
    .catch((err: Error) => console.error("[bot] sendMessage error:", err.message));
});

console.log("Bot is running...");
