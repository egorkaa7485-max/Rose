import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").notNull().default(0),
  referralCode: text("referral_code").notNull().unique(),
  referrerId: integer("referrer_id"), // кто привёл (при использовании промокода)
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // price in main currency
  pointsPrice: integer("points_price"), // price in points, null if not available for points
  category: text("category").notNull(), // 'flowers', '8march', 'cakes', 'pastries'
  imageUrl: text("image_url").notNull(),
});

export const bloggers = pgTable("bloggers", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  paymentMethod: text("payment_method").notNull(), // 'cash' or 'points'
  status: text("status").notNull().default("pending"),
  referrerId: integer("referrer_id"), // от кого пришёл покупатель
  referralBonusGiven: integer("referral_bonus_given").notNull().default(0), // 1 = выдано 500 рефереру
  createdAt: timestamp("created_at").defaultNow(),
});

export const bloggerGifts = pgTable("blogger_gifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bloggerId: integer("blogger_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, points: true, referralCode: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, status: true });
export const insertBloggerGiftSchema = createInsertSchema(bloggerGifts).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Blogger = typeof bloggers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type BloggerGift = typeof bloggerGifts.$inferSelect;

// Request/Response types
export type CreateOrderRequest = z.infer<typeof insertOrderSchema>;
export type CreateBloggerGiftRequest = z.infer<typeof insertBloggerGiftSchema>;
export type UseReferralRequest = { code: string };

export type AuthResponse = User | { message: string };
