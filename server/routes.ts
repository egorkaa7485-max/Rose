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
      
      const order = await storage.createOrder({ ...input, userId: mockUserId });
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
        return res.status(400).json({ message: "Invalid referral code" });
      }
      if (referrer.id === mockUserId) {
        return res.status(400).json({ message: "Cannot use your own code" });
      }
      
      // award 10 points to referrer
      await storage.updateUserPoints(referrer.id, referrer.points + 10);
      
      // give some points to the current user too
      const currentUser = await storage.getUser(mockUserId);
      if (currentUser) {
         await storage.updateUserPoints(currentUser.id, currentUser.points + 5);
      }
      
      res.json({ message: "Referral applied! Points awarded.", points: 5 });
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

  // Seed database on startup
  seedDatabase().catch(console.error);

  return httpServer;
}
