import { db } from "./db";
import {
  users,
  products,
  bloggers,
  orders,
  bloggerGifts,
  type User,
  type Product,
  type Blogger,
  type Order,
  type BloggerGift,
  type CreateOrderRequest,
  type CreateBloggerGiftRequest,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export const storage = {
  async getUser(id: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  },

  async getUserByTelegramId(telegramId: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return u;
  },

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.referralCode, code));
    return u;
  },

  async createUser(data: Omit<User, "id" | "points" | "referralCode">): Promise<User> {
    const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const [u] = await db.insert(users).values({ ...data, referralCode, points: 0 }).returning();
    return u;
  },

  async updateUserProfile(
    id: number,
    patch: Partial<Pick<User, "tgUsername" | "firstName" | "lastName" | "avatarUrl" | "telegramId">>,
  ): Promise<User | undefined> {
    const [u] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    return u;
  },

  async updateUserPoints(id: number, points: number): Promise<User | undefined> {
    const [u] = await db.update(users).set({ points }).where(eq(users.id, id)).returning();
    return u;
  },

  async setUserReferrer(userId: number, referrerId: number): Promise<User | undefined> {
    const [u] = await db.update(users).set({ referrerId }).where(eq(users.id, userId)).returning();
    return u;
  },

  async getProducts(category?: string, isFree?: boolean): Promise<Product[]> {
    let list = await db.select().from(products);
    if (category) list = list.filter((p) => p.category === category);
    if (isFree) list = list.filter((p) => p.pointsPrice != null);
    return list;
  },

  async getProduct(id: number): Promise<Product | undefined> {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  },

  async getBloggers(): Promise<Blogger[]> {
    return await db.select().from(bloggers);
  },

  async createOrder(data: CreateOrderRequest): Promise<Order> {
    const [o] = await db.insert(orders).values({ ...data, status: "pending", referralBonusGiven: 0 }).returning();
    return o;
  },

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  },

  async getOrder(id: number): Promise<Order | undefined> {
    const [o] = await db.select().from(orders).where(eq(orders.id, id));
    return o;
  },

  async confirmReferralBonus(orderId: number): Promise<{ ok: boolean; message?: string }> {
    const order = await this.getOrder(orderId);
    if (!order) return { ok: false, message: "Order not found" };
    if (!order.referrerId) return { ok: false, message: "No referrer" };
    if (order.referralBonusGiven) return { ok: false, message: "Bonus already given" };

    const referrer = await this.getUser(order.referrerId);
    if (!referrer) return { ok: false, message: "Referrer not found" };

    await db.update(orders).set({ referralBonusGiven: 1 }).where(eq(orders.id, orderId));
    await this.updateUserPoints(referrer.id, referrer.points + 500);
    return { ok: true };
  },

  async createBloggerGift(data: CreateBloggerGiftRequest): Promise<BloggerGift> {
    const [g] = await db.insert(bloggerGifts).values(data).returning();
    return g;
  },

  async createProduct(data: Omit<Product, "id">): Promise<Product> {
    const [p] = await db.insert(products).values(data).returning();
    return p;
  },

  async updateProduct(id: number, data: Partial<Omit<Product, "id">>): Promise<Product | undefined> {
    const [p] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return p;
  },

  async deleteProduct(id: number): Promise<boolean> {
    const p = await this.getProduct(id);
    if (!p) return false;
    await db.delete(products).where(eq(products.id, id));
    return true;
  },

  async createBlogger(data: Omit<Blogger, "id">): Promise<Blogger> {
    const [b] = await db.insert(bloggers).values(data).returning();
    return b;
  },

  async updateBlogger(id: number, data: Partial<Omit<Blogger, "id">>): Promise<Blogger | undefined> {
    const [b] = await db.update(bloggers).set(data).where(eq(bloggers.id, id)).returning();
    return b;
  },

  async deleteBlogger(id: number): Promise<boolean> {
    const [b] = await db.select().from(bloggers).where(eq(bloggers.id, id));
    if (!b) return false;
    await db.delete(bloggers).where(eq(bloggers.id, id));
    return true;
  },

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  },

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  },

  async getReferralsByReferrerId(referrerId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.referrerId, referrerId));
  },
};
