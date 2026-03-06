import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type { Product } from "@shared/schema";

export type CartItem = {
  productId: number;
  name: string;
  price: number; // в копейках
  imageUrl: string;
  quantity: number;
  isForBlogger?: boolean;
  bloggerNickname?: string;
  isGiftForUser?: boolean;
  giftRecipientName?: string;
  giftCode?: string;
};

type CartContextValue = {
  items: CartItem[];
  total: number;
  addItem: (
    product: Product,
    options?: {
      isForBlogger?: boolean;
      bloggerNickname?: string;
      isGiftForUser?: boolean;
      giftRecipientName?: string;
      giftCode?: string;
    }
  ) => void;
  removeItem: (index: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem: CartContextValue["addItem"] = (product, options) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === product.id &&
          !!i.isForBlogger === !!options?.isForBlogger &&
          i.bloggerNickname === options?.bloggerNickname &&
          !!i.isGiftForUser === !!options?.isGiftForUser &&
          i.giftCode === options?.giftCode,
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity: 1,
          isForBlogger: options?.isForBlogger,
          bloggerNickname: options?.bloggerNickname,
          isGiftForUser: options?.isGiftForUser,
          giftRecipientName: options?.giftRecipientName,
          giftCode: options?.giftCode,
        },
      ];
    });
  };

  const clear = () => setItems([]);

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, total, addItem, removeItem, clear }),
    [items, total],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

