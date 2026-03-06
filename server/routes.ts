import express, { type Express, type Request } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { bloggers as bloggersTable, products as productsTable } from "@shared/schema";
import crypto from "crypto";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Только изображения (jpg, png, webp, gif)"), ok);
  },
});

// Mock user for simplicity since we don't have real auth set up fully yet
let mockUserId: number | null = null;

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    // Seed Bloggers
    const bloggers = [
      { nickname: "@dina_saeva", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200" },
      { nickname: "@karna.val", avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200&h=200" },
      { nickname: "@gavrilinaa", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200" },
    ];
    for (const b of bloggers) {
      await db.insert(bloggersTable).values(b);
    }

    // Seed Products
    const prods = [
      { name: "Pink Peonies", description: "Beautiful delicate pink peonies.", price: 2500, pointsPrice: 50, category: "flowers", imageUrl: "https://images.unsplash.com/photo-1563241527-300ecb969192?auto=format&fit=crop&q=80&w=500" },
      { name: "8 March Gift Box", description: "Special gift box for women's day.", price: 5000, pointsPrice: null, category: "8march", imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=500" },
      { name: "Strawberry Cake", description: "Delicious strawberry cake with cream.", price: 1500, pointsPrice: 30, category: "cakes", imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&q=80&w=500" },
      { name: "Macarons Set", description: "Set of 6 pastel macarons.", price: 800, pointsPrice: 15, category: "pastries", imageUrl: "https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&q=80&w=500" },
    ];
    for (const p of prods) {
      await db.insert(productsTable).values(p);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/uploads", express.static(UPLOADS_DIR));

  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";

  function validateTelegramInitData(initData: string): { ok: true; params: URLSearchParams } | { ok: false } {
    try {
      if (!botToken) return { ok: false };
      const params = new URLSearchParams(initData);
      const hash = params.get("hash");
      if (!hash) return { ok: false };

      params.delete("hash");
      const pairs: string[] = [];
      Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([k, v]) => pairs.push(`${k}=${v}`));

      const dataCheckString = pairs.join("\n");
      const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
      const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
      if (computed !== hash) return { ok: false };
      return { ok: true, params };
    } catch {
      return { ok: false };
    }
  }

  app.post(api.telegram.login.path, async (req, res) => {
    try {
      if (!botToken) {
        return res.status(503).json({
          message: "Вход через Telegram временно недоступен. Укажите TELEGRAM_BOT_TOKEN в настройках.",
        });
      }
      const body = req.body ?? {};
      const input = api.telegram.login.input.safeParse(body);
      if (!input.success) {
        const msg = input.error.errors[0]?.message ?? "Требуется initData от Telegram WebApp";
        return res.status(400).json({ message: msg });
      }
      const validated = validateTelegramInitData(input.data.initData);
      if (!validated.ok) {
        return res.status(400).json({ message: "Telegram initData недействителен или истёк. Откройте приложение из бота." });
      }

      const userJson = validated.params.get("user");
      if (!userJson) return res.status(400).json({ message: "Нет данных пользователя в initData" });

      let tgUser: { id: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };
      try {
        tgUser = JSON.parse(userJson) as typeof tgUser;
      } catch {
        return res.status(400).json({ message: "Неверный формат данных пользователя" });
      }

      const telegramId = Number(tgUser.id);
      if (!Number.isFinite(telegramId)) return res.status(400).json({ message: "Неверный Telegram ID" });

      let user = await storage.getUserByTelegramId(telegramId);
      let username =
        (tgUser.username && tgUser.username.trim()) ||
        (tgUser.first_name ? `${tgUser.first_name.trim()}_${telegramId}` : `user_${telegramId}`);

      if (!user) {
        try {
          user = await storage.createUser({
            username,
            password: "password",
            telegramId,
            tgUsername: tgUser.username ?? null,
            firstName: tgUser.first_name ?? null,
            lastName: tgUser.last_name ?? null,
            avatarUrl: tgUser.photo_url ?? null,
            referrerId: null,
          } as any);
        } catch (createErr: unknown) {
          const msg = createErr && typeof (createErr as any).message === "string" ? (createErr as Error).message : "";
          if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("username")) {
            username = `user_${telegramId}_${Date.now().toString(36)}`;
            user = await storage.createUser({
              username,
              password: "password",
              telegramId,
              tgUsername: tgUser.username ?? null,
              firstName: tgUser.first_name ?? null,
              lastName: tgUser.last_name ?? null,
              avatarUrl: tgUser.photo_url ?? null,
              referrerId: null,
            } as any);
          } else {
            throw createErr;
          }
        }
      } else {
        user =
          (await storage.updateUserProfile(user.id, {
            telegramId,
            tgUsername: tgUser.username ?? null,
            firstName: tgUser.first_name ?? null,
            lastName: tgUser.last_name ?? null,
            avatarUrl: tgUser.photo_url ?? null,
          })) ?? user;
      }

      mockUserId = user.id;
      return res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Ошибка данных" });
      }
      console.error("[telegram/login]", err);
      return res.status(500).json({ message: "Ошибка сервера при входе. Попробуйте позже." });
    }
  });

  // Simple login mock for testing
  app.post("/api/login", async (req, res) => {
    const { username, telegramId, tgUsername, firstName, lastName, avatarUrl } = req.body ?? {};

    const tgIdNum =
      telegramId === undefined || telegramId === null ? undefined : Number(telegramId);

    let user =
      typeof tgIdNum === "number" && Number.isFinite(tgIdNum)
        ? await storage.getUserByTelegramId(tgIdNum)
        : undefined;

    if (!user && typeof username === "string" && username.trim()) {
      user = await storage.getUserByUsername(username.trim());
    }

    const safeUsername =
      (typeof tgUsername === "string" && tgUsername.trim()) ||
      (typeof username === "string" && username.trim()) ||
      (typeof firstName === "string" && firstName.trim()
        ? `${firstName.trim()}_${tgIdNum ?? "user"}`
        : `user_${tgIdNum ?? Math.floor(Math.random() * 1_000_000)}`);

    if (!user) {
      user = await storage.createUser({
        username: safeUsername,
        password: "password",
        telegramId: typeof tgIdNum === "number" && Number.isFinite(tgIdNum) ? tgIdNum : null,
        tgUsername: typeof tgUsername === "string" ? tgUsername : null,
        firstName: typeof firstName === "string" ? firstName : null,
        lastName: typeof lastName === "string" ? lastName : null,
        avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
        referrerId: null,
      } as any);
    } else {
      // обновляем телеграм-данные при каждом входе (если они пришли)
      const patch: any = {};
      if (typeof tgIdNum === "number" && Number.isFinite(tgIdNum)) patch.telegramId = tgIdNum;
      if (typeof tgUsername === "string") patch.tgUsername = tgUsername;
      if (typeof firstName === "string") patch.firstName = firstName;
      if (typeof lastName === "string") patch.lastName = lastName;
      if (typeof avatarUrl === "string") patch.avatarUrl = avatarUrl;
      if (Object.keys(patch).length) {
        user = (await storage.updateUserProfile(user.id, patch)) ?? user;
      }
    }

    mockUserId = user.id;
    res.json(user);
  });

  app.get(api.products.list.path, async (req, res) => {
    const category = req.query.category as string | undefined;
    const isFreeStr = req.query.isFree as string | undefined;
    const isFree = isFreeStr === "true";
    const priceFrom = req.query.priceFrom != null ? parseInt(String(req.query.priceFrom), 10) * 100 : undefined;
    const priceTo = req.query.priceTo != null ? parseInt(String(req.query.priceTo), 10) * 100 : undefined;
    const search = req.query.search as string | undefined;
    const products = await storage.getProducts(category, isFree, priceFrom, priceTo, search);
    res.json(products);
  });

  app.get(api.bloggers.list.path, async (req, res) => {
    const bloggers = await storage.getBloggers();
    res.json(bloggers);
  });

  app.post(api.orders.create.path, async (req, res) => {
    if (!mockUserId) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const input = api.orders.create.input.parse(req.body);
      // verify user has points if using points
      if (input.paymentMethod === 'points') {
        const product = await storage.getProduct(input.productId);
        const user = await storage.getUser(mockUserId);
        if (product && product.pointsPrice && user) {
          if (user.points < product.pointsPrice) {
            return res.status(400).json({ message: "Not enough points" });
          }
          // deduct points
          await storage.updateUserPoints(user.id, user.points - product.pointsPrice);
        } else {
          return res.status(400).json({ message: "Product not available for points" });
        }
      }
      
      const user = await storage.getUser(mockUserId);
      const order = await storage.createOrder({
        ...input,
        userId: mockUserId,
        referrerId: user?.referrerId ?? undefined,
      });
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.bloggerGifts.create.path, async (req, res) => {
    if (!mockUserId) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const input = api.bloggerGifts.create.input.parse(req.body);
      await storage.createBloggerGift({ ...input, userId: mockUserId });
      res.status(201).json({ message: "Gift sent successfully!" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.user.me.path, async (req, res) => {
    if (!mockUserId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(mockUserId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post(api.user.useReferral.path, async (req, res) => {
    if (!mockUserId) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const input = api.user.useReferral.input.parse(req.body);
      const referrer = await storage.getUserByReferralCode(input.code);
      if (!referrer) {
        return res.status(400).json({ message: "Неверный промокод" });
      }
      if (referrer.id === mockUserId) {
        return res.status(400).json({ message: "Нельзя использовать свой код" });
      }
      
      const currentUser = await storage.getUser(mockUserId);
      if (!currentUser) return res.status(404).json({ message: "User not found" });
      if (currentUser.referrerId) {
        return res.status(400).json({ message: "Промокод уже был применён ранее" });
      }
      
      await storage.setUserReferrer(mockUserId, referrer.id);
      res.json({ message: "Промокод применён! Скидка 250₽ на все товары.", points: 0 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/gift-codes", async (req, res) => {
    if (!mockUserId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(mockUserId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const giftCode = await storage.createGiftCode(user.id, code);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token && user.telegramId) {
      const text =
        `🎁 Ваш код для подарков: ${code}\n\n` +
        `Поделитесь этим кодом с друзьями — они смогут отправить вам подарок, не зная вашего адреса.\n\n` +
        `Бот: @Rose_BlooM_bot`;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: user.telegramId, text }),
      }).catch(() => {});

      const managerText = `📞 С вами свяжется менеджер для уточнения данных доставки в течение часа.`;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: user.telegramId, text: managerText }),
      }).catch(() => {});
    }
    res.status(201).json(giftCode);
  });

  app.get("/api/gift-codes/validate/:code", async (req, res) => {
    const code = (req.params.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ message: "Код не указан" });
    const giftCode = await storage.getGiftCodeByCode(code);
    if (!giftCode) return res.status(404).json({ message: "Код не найден" });
    const recipient = await storage.getUser(giftCode.userId);
    if (!recipient) return res.status(404).json({ message: "Получатель не найден" });
    res.json({
      code: giftCode.code,
      recipient: {
        id: recipient.id,
        username: recipient.username,
        tgUsername: recipient.tgUsername,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
      },
    });
  });

  app.post("/api/gift-orders", async (req, res) => {
    if (!mockUserId) return res.status(401).json({ message: "Unauthorized" });
    const { code, productId, recipientName } = req.body || {};
    if (!code || !productId) return res.status(400).json({ message: "Код и товар обязательны" });
    const giftCode = await storage.getGiftCodeByCode(String(code).trim().toUpperCase());
    if (!giftCode) return res.status(404).json({ message: "Код не найден" });
    const product = await storage.getProduct(Number(productId));
    if (!product) return res.status(404).json({ message: "Товар не найден" });
    const giftOrder = await storage.createGiftOrder({
      giftCodeId: giftCode.id,
      senderUserId: mockUserId,
      recipientUserId: giftCode.userId,
      productId: product.id,
      recipientName: recipientName || undefined,
    });
    res.status(201).json(giftOrder);
  });

  app.post(api.checkout.telegram.path, async (req, res) => {
    if (!mockUserId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.checkout.telegram.input.parse(req.body);
      if (!input.items.length) {
        return res.status(400).json({ message: "Корзина пуста" });
      }

      const user = await storage.getUser(mockUserId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const total = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      for (const item of input.items) {
        if (item.isGiftForUser && item.giftCode) {
          const giftCode = await storage.getGiftCodeByCode(item.giftCode);
          if (giftCode) {
            for (let q = 0; q < item.quantity; q++) {
              await storage.createGiftOrder({
                giftCodeId: giftCode.id,
                senderUserId: mockUserId,
                recipientUserId: giftCode.userId,
                productId: item.productId,
                recipientName: item.giftRecipientName,
              });
            }
          }
        }
      }

      const lines = input.items.map((item) => {
        const base = `• ${item.name} × ${item.quantity} — ${(item.price * item.quantity / 100).toFixed(0)} ₽`;
        if (item.isForBlogger && item.bloggerNickname) {
          return `${base} (для блогера ${item.bloggerNickname})`;
        }
        if (item.isGiftForUser && item.giftRecipientName) {
          return `${base} (подарок для ${item.giftRecipientName})`;
        }
        return base;
      });

      const username =
        user.tgUsername ? `@${user.tgUsername}` : `@${user.username}`;

      const text =
        `🌸 Новый заказ из мини-аппа Bloom & Bliss\n` +
        `Пользователь: ${username} (id ${user.id})\n\n` +
        `Позиции:\n${lines.join("\n")}\n\n` +
        `Итого: ${(total / 100).toFixed(0)} ₽`;

      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        return res.status(500).json({ message: "TELEGRAM_BOT_TOKEN не настроен. Обратитесь к администратору." });
      }

      const chatId = process.env.TELEGRAM_ORDER_CHAT_ID || "@CEO_PE";
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });

      const tgData = await tgRes.json().catch(() => ({}));
      if (!tgRes.ok) {
        const desc = tgData?.description || tgRes.statusText || "Ошибка Telegram";
        return res.status(502).json({
          message: `Не удалось отправить заказ в Telegram: ${desc}. Проверьте TELEGRAM_BOT_TOKEN и что бот добавлен в чат/канал.`,
        });
      }

      return res.json({ message: "Заказ отправлен в Telegram" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin API (проверка по заголовку X-Admin-Secret)
  const adminSecret = process.env.ADMIN_SECRET || "admin123";
  const isAdmin = (req: Request) => (req.header("X-Admin-Secret") ?? "") === adminSecret;

  app.get("/api/admin/orders", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const list = await storage.getOrders();
    const withUsers = await Promise.all(
      list.map(async (o) => {
        const u = await storage.getUser(o.userId);
        const ref = o.referrerId ? await storage.getUser(o.referrerId) : null;
        const p = await storage.getProduct(o.productId);
        return {
          ...o,
          user: u ? { id: u.id, username: u.username } : null,
          referrer: ref ? { id: ref.id, username: ref.username, referralCode: ref.referralCode } : null,
          product: p ? { id: p.id, name: p.name } : null,
        };
      })
    );
    res.json(withUsers);
  });

  app.post("/api/admin/orders/:id/confirm-referral", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const result = await storage.confirmReferralBonus(id);
    if (!result.ok) return res.status(400).json({ message: result.message });
    res.json({ message: "500 баллов выданы рефереру" });
  });

  app.get("/api/admin/orders/:id", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    const user = await storage.getUser(order.userId);
    const referrer = order.referrerId ? await storage.getUser(order.referrerId) : null;
    const product = await storage.getProduct(order.productId);
    res.json({
      ...order,
      user: user
        ? {
            id: user.id,
            username: user.username,
            telegramId: user.telegramId,
            tgUsername: user.tgUsername,
            firstName: user.firstName,
            lastName: user.lastName,
            referralCode: user.referralCode,
          }
        : null,
      referrer: referrer
        ? {
            id: referrer.id,
            username: referrer.username,
            referralCode: referrer.referralCode,
          }
        : null,
      product: product || null,
    });
  });

  app.post("/api/admin/upload", (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || "Ошибка загрузки" });
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "Файл не выбран" });
      const url = `/uploads/${file.filename}`;
      res.json({ url });
    });
  });

  app.get("/api/admin/products", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const category = req.query.category as string | undefined;
    const isFreeStr = req.query.isFree as string | undefined;
    const isFree = isFreeStr === "true";
    const list = await storage.getProducts(category, isFree);
    res.json(list);
  });

  app.post("/api/admin/products", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const { name, description, price, pointsPrice, category, imageUrl } = req.body;
    if (!name || !description || price == null || !category || !imageUrl) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const p = await storage.createProduct({
      name,
      description,
      price: parseInt(price, 10),
      pointsPrice: pointsPrice ? parseInt(pointsPrice, 10) : null,
      category,
      imageUrl,
    });
    res.status(201).json(p);
  });

  app.put("/api/admin/products/:id", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const { name, description, price, pointsPrice, category, imageUrl } = req.body;
    const p = await storage.updateProduct(id, {
      ...(name != null && { name }),
      ...(description != null && { description }),
      ...(price != null && { price: parseInt(price, 10) }),
      ...(pointsPrice !== undefined && { pointsPrice: pointsPrice ? parseInt(pointsPrice, 10) : null }),
      ...(category != null && { category }),
      ...(imageUrl != null && { imageUrl }),
    });
    if (!p) return res.status(404).json({ message: "Товар не найден" });
    res.json(p);
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const ok = await storage.deleteProduct(id);
    if (!ok) return res.status(404).json({ message: "Товар не найден" });
    res.json({ message: "Удалено" });
  });

  app.get("/api/admin/bloggers", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const list = await storage.getBloggers();
    res.json(list);
  });

  app.post("/api/admin/bloggers", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const { nickname, avatarUrl } = req.body;
    if (!nickname || !avatarUrl) return res.status(400).json({ message: "Missing nickname or avatarUrl" });
    const b = await storage.createBlogger({ nickname, avatarUrl });
    res.status(201).json(b);
  });

  app.put("/api/admin/bloggers/:id", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const { nickname, avatarUrl } = req.body;
    const b = await storage.updateBlogger(id, {
      ...(nickname != null && { nickname }),
      ...(avatarUrl != null && { avatarUrl }),
    });
    if (!b) return res.status(404).json({ message: "Блогер не найден" });
    res.json(b);
  });

  app.delete("/api/admin/bloggers/:id", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const ok = await storage.deleteBlogger(id);
    if (!ok) return res.status(404).json({ message: "Блогер не найден" });
    res.json({ message: "Удалено" });
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const list = await storage.getAllUsers();
    const withDetails = await Promise.all(
      list.map(async (u) => {
        const userOrders = await storage.getOrdersByUserId(u.id);
        const referrals = await storage.getReferralsByReferrerId(u.id);
        const ordersWithProducts = await Promise.all(
          userOrders.map(async (o) => {
            const p = await storage.getProduct(o.productId);
            return { ...o, product: p };
          })
        );
        return {
          ...u,
          orders: ordersWithProducts,
          referrals,
        };
      })
    );
    res.json(withDetails);
  });

  app.post("/api/admin/users/:id/send-message", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const { text } = req.body || {};
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Текст сообщения обязателен" });
    }
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    if (user.telegramId == null) {
      return res.status(400).json({ message: "У пользователя нет Telegram (не входил через TG)" });
    }
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(500).json({ message: "TELEGRAM_BOT_TOKEN не настроен" });
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegramId,
        text: text.trim(),
      }),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok) {
      return res.status(502).json({
        message: tgData?.description || "Не удалось отправить сообщение в Telegram",
      });
    }
    res.json({ message: "Сообщение отправлено" });
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const { points } = req.body || {};
    if (typeof points !== "number" || points < 0) {
      return res.status(400).json({ message: "Баллы должны быть числом >= 0" });
    }
    const u = await storage.updateUserPoints(id, points);
    if (!u) return res.status(404).json({ message: "Пользователь не найден" });
    res.json(u);
  });

  app.get("/api/admin/gift-codes", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const list = await storage.getGiftCodes();
    res.json(list);
  });

  app.get("/api/admin/gift-orders", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const list = await storage.getGiftOrders();
    res.json(list);
  });

  // Seed database on startup
  seedDatabase().catch(console.error);

  return httpServer;
}
