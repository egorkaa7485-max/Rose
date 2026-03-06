import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { TopBar, BottomNav } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { FilterBar } from "@/components/FilterBar";
import { useProducts } from "@/hooks/use-products";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { CartBar } from "@/components/CartBar";
import { Loader2, Gift, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@shared/schema";

const CATEGORIES = [
  { id: "all", label: "Всё" },
  { id: "flowers", label: "Цветы" },
  { id: "8march", label: "8 Марта" },
  { id: "cakes", label: "Торты" },
  { id: "pastries", label: "Пирожные" },
];

type Recipient = {
  id: number;
  username: string;
  tgUsername: string | null;
  firstName: string | null;
  lastName: string | null;
};

export default function GiftByCode() {
  const [, params] = useRoute("/gift/:code");
  const code = params?.code ? decodeURIComponent(params.code).trim().toUpperCase() : "";
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState("");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");

  const { data: products, isLoading } = useProducts(
    activeCategory === "all" ? undefined : activeCategory,
    undefined,
    priceFrom ? parseInt(priceFrom, 10) : undefined,
    priceTo ? parseInt(priceTo, 10) : undefined,
    search || undefined
  );
  const { data: user } = useUser();
  const { toast } = useToast();
  const { addItem } = useCart();

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setError("Код не указан");
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/gift-codes/validate/${encodeURIComponent(code)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d?.message || "Код не найден"); });
        return r.json();
      })
      .then((data) => setRecipient(data.recipient))
      .catch((e) => {
        setError(e.message || "Код не найден");
        setRecipient(null);
      })
      .finally(() => setLoading(false));
  }, [code]);

  const recipientName =
    recipient?.tgUsername
      ? `@${recipient.tgUsername}`
      : recipient?.firstName || recipient?.lastName
        ? [recipient.firstName, recipient.lastName].filter(Boolean).join(" ")
        : recipient?.username || "";

  const handleAddGift = (product: Product) => {
    if (!user) {
      toast({ title: "Авторизуйтесь", description: "Для отправки подарка нужен аккаунт.", variant: "destructive" });
      return;
    }
    addItem(product, {
      isGiftForUser: true,
      giftRecipientName: recipientName,
      giftCode: code,
    });
    toast({ title: "В корзине", description: `Подарок для ${recipientName} добавлен.` });
  };

  if (loading || (!recipient && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !recipient) {
    return (
      <div className="pt-24 pb-32 px-4 max-w-lg mx-auto min-h-screen">
        <TopBar />
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-destructive mb-4">{error || "Код не найден"}</p>
          <Link href="/profile">
            <a className="text-primary hover:underline">Вернуться в профиль</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto min-h-screen">
      <TopBar />

      <Link href="/profile">
        <a className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Назад в профиль
        </a>
      </Link>

      <div className="mb-6 glass rounded-2xl p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl">Подарок для {recipientName}</h2>
          <p className="text-sm text-muted-foreground">
            Выберите подарок — мы доставим адресату. Адрес знать не нужно.
          </p>
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-4 pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className="relative px-6 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
          >
            {activeCategory === cat.id && (
              <motion.div
                layoutId="gift-category"
                className="absolute inset-0 bg-white shadow-md border border-white/60 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={activeCategory === cat.id ? "text-primary" : "text-muted-foreground"}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        priceFrom={priceFrom}
        onPriceFromChange={setPriceFrom}
        priceTo={priceTo}
        onPriceToChange={setPriceTo}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAction={() => handleAddGift(product)}
              onOpenDetail={() => setDetailProduct(product)}
              hasReferralDiscount={!!user?.referrerId}
            />
          ))}
          {products?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground glass rounded-3xl">
              Нет товаров в каталоге.
            </div>
          )}
        </div>
      )}

      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        onAddToCart={() => {
          if (detailProduct) {
            handleAddGift(detailProduct);
            setDetailProduct(null);
          }
        }}
        hasReferralDiscount={!!user?.referrerId}
      />

      <CartBar />
      <BottomNav />
    </div>
  );
}
