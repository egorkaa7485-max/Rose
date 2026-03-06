import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { bloggers as bloggersTable, products as productsTable } from "@shared/schema";

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
  // Simple login mock for testing
  app.post("/api/login", async (req, res) => {
    const { username } = req.body;
    let user = await storage.getUserByUsername(username);
    if (!user) {
      user = await storage.createUser({ username, password: "password" });
    }
    mockUserId = user.id;
    res.json(user);
  });

  app.get(api.products.list.path, async (req, res) => {
    const category = req.query.category as string | undefined;
    const isFreeStr = req.query.isFree as string | undefined;
    const isFree = isFreeStr === 'true';
    
    const products = await storage.getProducts(category, isFree);
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

  // Admin API (проверка по заголовку X-Admin-Secret)
  const adminSecret = process.env.ADMIN_SECRET || "admin123";
  const isAdmin = (req: { headers: { [k: string]: string | undefined } }) =>
    req.headers["x-admin-secret"] === adminSecret;

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

  app.post("/api/admin/bloggers", async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
    const { nickname, avatarUrl } = req.body;
    if (!nickname || !avatarUrl) return res.status(400).json({ message: "Missing nickname or avatarUrl" });
    const b = await storage.createBlogger({ nickname, avatarUrl });
    res.status(201).json(b);
  });

  // Seed database on startup
  seedDatabase().catch(console.error);

  return httpServer;
}
