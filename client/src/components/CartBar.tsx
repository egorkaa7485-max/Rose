import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart } from "lucide-react";

export function CartBar() {
  const { items, total, clear } = useCart();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (items.length === 0) return null;

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch(api.checkout.telegram.path, {
        method: api.checkout.telegram.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Ошибка при отправке заказа");
      }
      clear();
      setOpen(false);
      toast({ title: "Заказ отправлен", description: "Мы написали @CEO_PE в Telegram." });
      window.location.href = "https://t.me/CEO_PE";
    } catch (e: any) {
      toast({
        title: "Не удалось отправить заказ",
        description: e?.message || "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="pointer-events-auto glass rounded-full px-5 py-3 flex items-center gap-2 shadow-lg shadow-primary/20">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              Корзина · {items.length} {items.length === 1 ? "товар" : "товара"} · {(
                total / 100
              ).toFixed(0)}{" "}
              ₽
            </span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>Корзина</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[45vh] pr-1">
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}-${item.bloggerNickname || "self"}`}
                className="flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm truncate">{item.name}</div>
                  {item.isForBlogger && item.bloggerNickname && (
                    <div className="text-xs text-primary">
                      Подарок для блогера {item.bloggerNickname}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {item.quantity} × {(item.price / 100).toFixed(0)} ₽
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Итого: <span className="font-semibold text-foreground">{(total / 100).toFixed(0)} ₽</span>
            </div>
            <Button onClick={handleCheckout} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Оплатить в Telegram"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

