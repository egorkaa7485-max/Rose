import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar, BottomNav } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { CartBar } from "@/components/CartBar";

const CATEGORIES = [
  { id: "all", label: "Вся магия" },
  { id: "flowers", label: "Цветы" },
  { id: "8march", label: "8 Марта" },
  { id: "cakes", label: "Торты" },
  { id: "pastries", label: "Пирожные" }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");
  const { data: products, isLoading } = useProducts(activeTab === "all" ? undefined : activeTab);
  const { data: user } = useUser();
  const { toast } = useToast();
  const { addItem } = useCart();

  useEffect(() => {
    if (!user) return;
    const shown = sessionStorage.getItem("welcome_shown");
    if (shown === "1") return;
    sessionStorage.setItem("welcome_shown", "1");
    toast({
      title: "Добро пожаловать!",
      description: "Выберите букет или подарок — оформим красиво и быстро.",
    });
  }, [toast, user]);

  const handlePurchase = (productId: number) => {
    if (!user) {
      toast({ title: "Авторизуйтесь", description: "Для оформления заказа нужен аккаунт.", variant: "destructive" });
      return;
    }
    const product = products?.find((p) => p.id === productId);
    if (!product) return;
    addItem(product);
    toast({ title: "В корзине", description: `${product.name} добавлен в корзину.` });
  };

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto min-h-screen">
      <TopBar />
      
      <div className="mb-8">
        <h2 className="font-display font-bold text-4xl mb-2 text-foreground">
          Коллекция <span className="text-gradient">Элегантности</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Найдите идеальный подарок для особенного человека.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-8 pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className="relative px-6 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
          >
            {activeTab === cat.id && (
              <motion.div
                layoutId="active-category"
                className="absolute inset-0 bg-white shadow-md border border-white/60 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={activeTab === cat.id ? "text-primary" : "text-muted-foreground"}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {products?.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAction={() => handlePurchase(product.id)}
                hasReferralDiscount={!!user?.referrerId}
              />
            ))}
          </AnimatePresence>
          {products?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground glass rounded-3xl">
              В этой категории пока нет товаров.
            </div>
          )}
        </motion.div>
      )}

      <CartBar />
      <BottomNav />
    </div>
  );
}
