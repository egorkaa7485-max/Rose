import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar, BottomNav } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { useBloggers, useSendBloggerGift } from "@/hooks/use-bloggers";
import { useProducts } from "@/hooks/use-products";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Gift } from "lucide-react";

export default function BloggerGifts() {
  const [selectedBloggerId, setSelectedBloggerId] = useState<number | null>(null);
  
  const { data: bloggers, isLoading: loadingBloggers } = useBloggers();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: user } = useUser();
  const { mutate: sendGift, isPending } = useSendBloggerGift();
  const { toast } = useToast();

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
          toast({ title: "Подарок отправлен! 🎁", description: "Блогер получит ваш красивый сюрприз." });
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
                className={`relative flex flex-col items-center flex-shrink-0 w-32 gap-2 transition-all duration-300 ${
                  selectedBloggerId === blogger.id ? "scale-105" : "opacity-70 hover:opacity-100"
                }`}
              >
                <div className={`w-28 h-28 rounded-2xl overflow-hidden p-1 transition-all duration-300 ${
                  selectedBloggerId === blogger.id ? "bg-gradient-to-tr from-primary to-accent shadow-lg shadow-primary/30" : "bg-white/50"
                }`}>
                  <img 
                    src={blogger.avatarUrl} 
                    alt={blogger.nickname} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-medium text-center truncate w-full">
                  @{blogger.nickname}
                </span>
                
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
                    hasReferralDiscount={!!user?.referrerId}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
