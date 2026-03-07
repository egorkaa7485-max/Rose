import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "rose-bloom-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };

  // SO_REUSEPORT не поддерживается на Windows, поэтому включаем только там, где есть поддержка
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, async () => {
    log(`serving on port ${port}`);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      try {
        const TelegramBot = (await import("node-telegram-bot-api")).default;
        const appUrl = process.env.APP_URL || "https://rose-production-f333.up.railway.app/";
        const welcomeText =
          "Приветствуем вас в Rose Bloom! 🌹🎁\n\n" +
          "Наш бот создан для того, чтобы сделать ваши праздники еще ярче и радостнее. Здесь вы можете легко подарить или получить подарок на любой праздник, а также заработать баллы за приглашение друзей!\n\n" +
          "Как это работает:\n" +
          "1. Пригласите своих друзей в Rose Bloom.\n" +
          "2. Если ваш друг закажет подарок, вы получите баллы.\n" +
          "3. Накопленные баллы можно обменять на подарки для других!\n\n" +
          "Давайте сделаем каждый праздник особенным вместе! 🎉✨";
        const bot = new TelegramBot(token, { polling: true });
        bot.onText(/\/start/, (msg: { chat: { id: number } }) => {
          const chatId = msg.chat.id;
          const siteUrl = appUrl.replace(/\/$/, "");
          const displayUrl = siteUrl.replace(/^https?:\/\//, "") || "rose-production-f333.up.railway.app";
          bot
            .sendMessage(chatId, welcomeText, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: displayUrl, url: siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}` }],
                ],
              },
            })
            .catch((err: Error) => log(`bot sendMessage error: ${err.message}`, "bot"));
        });
        log("Telegram bot polling started", "bot");
      } catch (err) {
        log(`Bot failed to start: ${(err as Error).message}`, "bot");
      }
    }
  });
})();
