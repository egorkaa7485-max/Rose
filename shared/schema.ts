import { pgTable, text, serial, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").notNull().default(0),
  referralCode: text("referral_code").notNull().unique(),
  referrerId: integer("referrer_id"), // кто привёл (при использовании промокода)
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  tgUsername: text("tg_username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
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

// Загруженные файлы (фото товаров, блогеров) — хранятся в БД, не теряются при перезапуске
export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  data: text("data").notNull(), // base64
  mimeType: text("mime_type").notNull(),
  filename: text("filename").notNull(),
});

// Коды для подарков: пользователь создаёт код, по нему другие могут отправить ему подарок
export const giftCodes = pgTable("gift_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // получатель подарков (владелец кода)
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Заказы подарков по коду: кто отправил, кому, какой товар
export const giftOrders = pgTable("gift_orders", {
  id: serial("id").primaryKey(),
  giftCodeId: integer("gift_code_id").notNull(),
  senderUserId: integer("sender_user_id").notNull(),
  recipientUserId: integer("recipient_user_id").notNull(),
  productId: integer("product_id").notNull(),
  recipientName: text("recipient_name"),
  status: text("status").notNull().default("pending"),
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
export type GiftCode = typeof giftCodes.$inferSelect;
export type GiftOrder = typeof giftOrders.$inferSelect;

// Request/Response types
export type CreateOrderRequest = z.infer<typeof insertOrderSchema>;
export type CreateBloggerGiftRequest = z.infer<typeof insertBloggerGiftSchema>;
export type UseReferralRequest = { code: string };

export type AuthResponse = User | { message: string };
