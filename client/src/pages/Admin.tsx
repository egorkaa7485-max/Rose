import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Package, Users, ShoppingCart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_KEY = "admin_secret";

type Order = {
  id: number;
  userId: number;
  productId: number;
  referrerId: number | null;
  referralBonusGiven: number;
  status: string;
  user: { id: number; username: string } | null;
  referrer: { id: number; username: string; referralCode: string } | null;
  product: { id: number; name: string } | null;
};

function fetchAdmin<T>(path: string, secret: string, opts?: RequestInit): Promise<T> {
  return fetch(path, {
    ...opts,
    headers: { ...opts?.headers, "X-Admin-Secret": secret },
    credentials: "include",
  }).then((r) => {
    if (!r.ok) throw new Error(r.status === 401 ? "Неверный пароль" : "Ошибка");
    return r.json();
  });
}

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"orders" | "products" | "bloggers">("orders");

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    pointsPrice: "",
    category: "flowers",
    imageUrl: "",
  });
  const [newBlogger, setNewBlogger] = useState({ nickname: "", avatarUrl: "" });

  useEffect(() => {
    const s = localStorage.getItem(ADMIN_KEY);
    if (s) setSavedSecret(s);
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    localStorage.setItem(ADMIN_KEY, secret.trim());
    setSavedSecret(secret.trim());
  };

  const loadOrders = () => {
    if (!savedSecret) return;
    setLoading(true);
    setError("");
    fetchAdmin<Order[]>("/api/admin/orders", savedSecret)
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (savedSecret && tab === "orders") loadOrders();
  }, [savedSecret, tab]);

  const confirmReferral = (orderId: number) => {
    if (!savedSecret) return;
    fetchAdmin(`/api/admin/orders/${orderId}/confirm-referral`, savedSecret, { method: "POST" })
      .then(() => loadOrders())
      .catch((err) => setError(err.message));
  };

  const addProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedSecret) return;
    setLoading(true);
    fetchAdmin("/api/admin/products", savedSecret, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newProduct,
        price: parseInt(newProduct.price, 10) * 100, // рубли → копейки
        pointsPrice: newProduct.pointsPrice ? parseInt(newProduct.pointsPrice, 10) : null,
      }),
    })
      .then(() => {
        setNewProduct({ name: "", description: "", price: "", pointsPrice: "", category: "flowers", imageUrl: "" });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const addBlogger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedSecret) return;
    setLoading(true);
    fetchAdmin("/api/admin/bloggers", savedSecret, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBlogger),
    })
      .then(() => setNewBlogger({ nickname: "", avatarUrl: "" }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  if (!savedSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-primary/20 rounded-full blur-3xl liquid-shape" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-[2rem] p-8 w-full max-w-md relative z-10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-8 h-8 text-primary" />
            <h1 className="font-display font-bold text-2xl">Админ-панель</h1>
          </div>
          <form onSubmit={login} className="space-y-4">
            <Label>Секретный ключ</Label>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Введите ключ"
              className="bg-background"
            />
            <Button type="submit" className="w-full">
              Войти
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-3xl">Админ-панель</h1>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem(ADMIN_KEY);
            setSavedSecret("");
          }}
        >
          Выйти
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="flex gap-2 mb-6">
        {(["orders", "products", "bloggers"] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "orders" && <ShoppingCart className="w-4 h-4" />}
            {t === "products" && <Package className="w-4 h-4" />}
            {t === "bloggers" && <Users className="w-4 h-4" />}
            {t === "orders" && "Заказы"}
            {t === "products" && "Товары"}
            {t === "bloggers" && "Блогеры"}
          </Button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="space-y-4">
          <Button onClick={loadOrders} variant="outline" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Обновить"}
          </Button>
          {orders.map((o) => (
            <div
              key={o.id}
              className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <div className="font-medium">Заказ #{o.id}</div>
                <div className="text-sm text-muted-foreground">
                  Покупатель: {o.user?.username ?? "—"} | Товар: {o.product?.name ?? "—"}
                </div>
                {o.referrer && (
                  <div className="text-sm text-primary mt-1">
                    Привёл: {o.referrer.username} (код {o.referrer.referralCode})
                  </div>
                )}
              </div>
              {o.referrerId && o.referralBonusGiven === 0 && (
                <Button
                  onClick={() => confirmReferral(o.id)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Выдать 500 баллов рефереру
                </Button>
              )}
              {o.referralBonusGiven === 1 && (
                <span className="text-sm text-green-600">Бонус выдан</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "products" && (
        <form onSubmit={addProduct} className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-display font-bold text-xl">Добавить товар</h3>
          <div>
            <Label>Название</Label>
            <Input
              value={newProduct.name}
              onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Описание</Label>
            <Input
              value={newProduct.description}
              onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Цена (₽)</Label>
            <Input
              type="number"
              value={newProduct.price}
              onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Цена в баллах (пусто = нет)</Label>
            <Input
              type="number"
              value={newProduct.pointsPrice}
              onChange={(e) => setNewProduct((p) => ({ ...p, pointsPrice: e.target.value }))}
            />
          </div>
          <div>
            <Label>Категория</Label>
            <select
              value={newProduct.category}
              onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-4 py-2"
            >
              <option value="flowers">Цветы</option>
              <option value="8march">8 Марта</option>
              <option value="cakes">Торты</option>
              <option value="pastries">Пирожные</option>
            </select>
          </div>
          <div>
            <Label>URL картинки</Label>
            <Input
              value={newProduct.imageUrl}
              onChange={(e) => setNewProduct((p) => ({ ...p, imageUrl: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Добавить"}
          </Button>
        </form>
      )}

      {tab === "bloggers" && (
        <form onSubmit={addBlogger} className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-display font-bold text-xl">Добавить блогера</h3>
          <div>
            <Label>Никнейм (без @)</Label>
            <Input
              value={newBlogger.nickname}
              onChange={(e) => setNewBlogger((p) => ({ ...p, nickname: e.target.value }))}
              placeholder="username"
              required
            />
          </div>
          <div>
            <Label>URL аватара</Label>
            <Input
              value={newBlogger.avatarUrl}
              onChange={(e) => setNewBlogger((p) => ({ ...p, avatarUrl: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Добавить"}
          </Button>
        </form>
      )}

      <div className="mt-8 p-4 glass rounded-xl text-sm text-muted-foreground">
        <strong>Ссылка на админку:</strong>{" "}
        <code className="bg-background px-2 py-1 rounded">
          {typeof window !== "undefined" ? `${window.location.origin}/admin` : "/admin"}
        </code>
      </div>
    </div>
  );
}
