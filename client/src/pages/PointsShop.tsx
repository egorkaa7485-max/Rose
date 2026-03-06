import { motion } from "framer-motion";
import { useState } from "react";
import { TopBar, BottomNav } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { useProducts } from "@/hooks/use-products";
import { useUser } from "@/hooks/use-user";
import { useCreateOrder } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Product } from "@shared/schema";

export default function PointsShop() {
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [priceTo, setPriceTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useProducts(
    undefined,
    "true",
    priceFrom ? parseInt(priceFrom, 10) : undefined,
    priceTo ? parseInt(priceTo, 10) : undefined,
    search || undefined
  );
  const { data: user } = useUser();
  const { mutate: createOrder } = useCreateOrder();
  const { toast } = useToast();
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const handlePointsPurchase = (productId: number, price: number | null) => {
    if (!user) {
      toast({ title: "Нужна авторизация", description: "Войдите, чтобы использовать бонусы.", variant: "destructive" });
      return;
    }
    if (!price || user.points < price) {
      toast({ title: "Недостаточно баллов", description: "Пригласите больше друзей, чтобы заработать бонусы!", variant: "destructive" });
      return;
    }

    createOrder(
      { userId: user.id, productId, paymentMethod: "points" },
      {
        onSuccess: () => toast({ title: "Готово!", description: "Вы обменяли товар на свои баллы." }),
        onError: (err) => toast({ title: "Ошибка", description: err.message, variant: "destructive" })
      }
    );
  };

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto min-h-screen relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-20 right-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10 liquid-shape" />
      <div className="absolute bottom-40 left-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10 liquid-shape-fast" />

      <TopBar />

      <div className="mb-8 glass rounded-[2rem] p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
        <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h2 className="font-display font-bold text-3xl mb-2 text-foreground">
          Бонусный бутик
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          У вас <strong className="text-primary text-xl">{user?.points || 0}</strong> баллов. 
          Обменивайте их на подарки, десерты и эксклюзивные букеты.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <Input
          type="number"
          placeholder="Цена от (₽)"
          value={priceFrom}
          onChange={(e) => setPriceFrom(e.target.value)}
          className="w-28 bg-background"
        />
        <Input
          type="number"
          placeholder="Цена до (₽)"
          value={priceTo}
          onChange={(e) => setPriceTo(e.target.value)}
          className="w-28 bg-background"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              usePoints={true}
              onAction={() => handlePointsPurchase(product.id, product.pointsPrice)}
              onOpenDetail={() => setDetailProduct(product)}
            />
          ))}
          {products?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground glass rounded-3xl">
              Совсем скоро здесь появятся новые подарки!
            </div>
          )}
        </div>
      )}

      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        onAddToCart={() => {
          if (detailProduct?.pointsPrice && user) {
            handlePointsPurchase(detailProduct.id, detailProduct.pointsPrice);
            setDetailProduct(null);
          }
        }}
        usePoints={true}
      />

      <BottomNav />
    </div>
  );
}
