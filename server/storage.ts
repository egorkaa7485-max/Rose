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
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "points" | "referralCode">): Promise<User>;
  updateUserPoints(id: number, points: number): Promise<User>;
  
  getProducts(category?: string, isFree?: boolean): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  
  getBloggers(): Promise<Blogger[]>;
  
  createOrder(order: CreateOrderRequest): Promise<Order>;
  createBloggerGift(gift: CreateBloggerGiftRequest): Promise<BloggerGift>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user;
  }

  async createUser(insertUser: Omit<User, "id" | "points" | "referralCode">): Promise<User> {
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [user] = await db.insert(users).values({ ...insertUser, referralCode, points: 0 }).returning();
    return user;
  }

  async updateUserPoints(id: number, points: number): Promise<User> {
    const [user] = await db.update(users).set({ points }).where(eq(users.id, id)).returning();
    return user;
  }

  async getProducts(category?: string, isFree?: boolean): Promise<Product[]> {
    let query = db.select().from(products);
    let allProducts = await query;
    if (category) {
      allProducts = allProducts.filter(p => p.category === category);
    }
    if (isFree) {
      allProducts = allProducts.filter(p => p.pointsPrice !== null);
    }
    return allProducts;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getBloggers(): Promise<Blogger[]> {
    return await db.select().from(bloggers);
  }

  async createOrder(order: CreateOrderRequest): Promise<Order> {
    const [newOrder] = await db.insert(orders).values({ ...order, status: "pending" }).returning();
    return newOrder;
  }

  async createBloggerGift(gift: CreateBloggerGiftRequest): Promise<BloggerGift> {
    const [newGift] = await db.insert(bloggerGifts).values(gift).returning();
    return newGift;
  }
}

export const storage = new DatabaseStorage();
