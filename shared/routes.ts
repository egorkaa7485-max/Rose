import { z } from 'zod';
import { insertOrderSchema, insertBloggerGiftSchema, products, bloggers, users } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  badRequest: z.object({
    message: z.string(),
  }),
};

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        category: z.string().optional(),
        isFree: z.string().optional(), // 'true' to get products available for points
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
  },
  bloggers: {
    list: {
      method: 'GET' as const,
      path: '/api/bloggers' as const,
      responses: {
        200: z.array(z.custom<typeof bloggers.$inferSelect>()),
      },
    },
  },
  orders: {
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: insertOrderSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(), // Actually we might return an order, or just success
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
      },
    },
  },
  bloggerGifts: {
    create: {
      method: 'POST' as const,
      path: '/api/blogger-gifts' as const,
      input: insertBloggerGiftSchema,
      responses: {
        201: z.object({ message: z.string() }),
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
      },
    },
  },
  user: {
    me: {
      method: 'GET' as const,
      path: '/api/user/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    useReferral: {
      method: 'POST' as const,
      path: '/api/user/referral' as const,
      input: z.object({ code: z.string() }),
      responses: {
        200: z.object({ message: z.string(), points: z.number() }),
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ProductsListResponse = z.infer<typeof api.products.list.responses[200]>;
export type BloggersListResponse = z.infer<typeof api.bloggers.list.responses[200]>;
