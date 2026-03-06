import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar, BottomNav } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { useBloggers, useSendBloggerGift } from "@/hooks/use-bloggers";
import { useProducts } from "@/hooks/use-products";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Gift } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { FilterBar } from "@/components/FilterBar";
import type { Product } from "@shared/schema";

function formatNickname(nickname: string) {
  const trimmed = nickname?.trim() ?? "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export default function BloggerGifts() {
  const [selectedBloggerId, setSelectedBloggerId] = useState<number | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [priceTo, setPriceTo] = useState<string>("");
  const [search, setSearch] = useState("");
  
  const { data: bloggers, isLoading: loadingBloggers } = useBloggers();
  const { data: products, isLoading: loadingProducts } = useProducts(
    undefined,
    undefined,
    priceFrom ? parseInt(priceFrom, 10) : undefined,
    priceTo ? parseInt(priceTo, 10) : undefined,
    search || undefined
  );
  const { data: user } = useUser();
  const { mutate: sendGift, isPending } = useSendBloggerGift();
  const { toast } = useToast();
  const { addItem } = useCart();

  const handleSendGift = (productId: number) => {
    if (!user) {
      toast({ title: "Нужна авторизация", variant: "destructive" });
      return;
    }
    if (!selectedBloggerId) {
      toast({ title: "Сначала выберите блогера", variant: "destructive" });
      return;
    }

    sendGift(
      { userId: user.id, bloggerId: selectedBloggerId, productId },
      {
        onSuccess: () => {
          const blogger = bloggers?.find((b) => b.id === selectedBloggerId);
          const product = products?.find((p) => p.id === productId);
          if (product && blogger) {
            addItem(product, {
              isForBlogger: true,
              bloggerNickname: formatNickname(blogger.nickname),
            });
          }
          toast({
            title: "Подарок отправлен! 🎁",
            description: "Блогер получит ваш красивый сюрприз, а позиция добавлена в корзину.",
          });
          setSelectedBloggerId(null);
        }
      }
    );
  };

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto min-h-screen">
      <TopBar />
      
      <div className="mb-8">
        <h2 className="font-display font-bold text-4xl mb-2 text-foreground flex items-center gap-3">
          Подарок для <span className="text-gradient">блогера</span> <Gift className="w-8 h-8 text-primary" />
        </h2>
        <p className="text-muted-foreground text-lg">
          Покажите внимание своим любимым инфлюенсерам.
        </p>
      </div>

      {/* Blogger Selection */}
      <div className="mb-10">
        <h3 className="font-display font-bold text-xl mb-4 ml-2">1. Выберите блогера</h3>
        {loadingBloggers ? (
          <div className="h-24 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 px-2">
            {bloggers?.map((blogger) => (
              <button
                key={blogger.id}
                onClick={() => setSelectedBloggerId(blogger.id)}
                className={`relative flex-shrink-0 transition-all duration-300 ${
                  selectedBloggerId === blogger.id ? "scale-[1.02]" : "opacity-80 hover:opacity-100"
                }`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-[2rem] p-3 w-40 overflow-hidden"
                >
                  <div className="relative z-10 aspect-square rounded-[1.5rem] overflow-hidden mb-3 shadow-sm bg-muted/50">
                    <img
                      src={blogger.avatarUrl}
                      alt={blogger.nickname}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-2 pb-1">
                    <div className="font-display font-bold text-base truncate text-foreground">
                      {formatNickname(blogger.nickname)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Выбрать
                    </div>
                  </div>
                </motion.div>
                
                {selectedBloggerId === blogger.id && (
                  <motion.div layoutId="check" className="absolute -top-1 -right-1 bg-white rounded-full text-primary">
                    <CheckCircle2 className="w-6 h-6" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Selection */}
      <AnimatePresence>
        {selectedBloggerId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 className="font-display font-bold text-xl mb-4 ml-2">2. Выберите подарок</h3>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              priceFrom={priceFrom}
              onPriceFromChange={setPriceFrom}
              priceTo={priceTo}
              onPriceToChange={setPriceTo}
            />
            {loadingProducts ? (
               <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products?.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    actionText="Отправить"
                    onAction={() => handleSendGift(product.id)}
                    onOpenDetail={() => setDetailProduct(product)}
                    hasReferralDiscount={!!user?.referrerId}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        onAddToCart={() => {
          if (!detailProduct || !selectedBloggerId || !user) return;
          const blogger = bloggers?.find((b) => b.id === selectedBloggerId);
          sendGift(
            { userId: user.id, bloggerId: selectedBloggerId, productId: detailProduct.id },
            {
              onSuccess: () => {
                if (blogger) {
                  addItem(detailProduct, {
                    isForBlogger: true,
                    bloggerNickname: formatNickname(blogger.nickname),
                  });
                }
                toast({
                  title: "Подарок отправлен! 🎁",
                  description: "Блогер получит ваш сюрприз, позиция добавлена в корзину.",
                });
                setDetailProduct(null);
              },
            }
          );
        }}
        hasReferralDiscount={!!user?.referrerId}
      />

      <BottomNav />
    </div>
  );
}
