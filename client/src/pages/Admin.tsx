import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  Package,
  Users,
  ShoppingCart,
  Lock,
  Upload,
  Pencil,
  Trash2,
  Gift,
  User,
  X,
} from "lucide-react";
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

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  pointsPrice: number | null;
  category: string;
  imageUrl: string;
};

type Blogger = {
  id: number;
  nickname: string;
  avatarUrl: string;
};

type UserWithDetails = {
  id: number;
  username: string;
  points: number;
  referralCode: string;
  referrerId: number | null;
  telegramId: number | null;
  tgUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  orders: (Order & { product: Product | null })[];
  referrals: { id: number; username: string }[];
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

function useAdminUpload(secret: string) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "X-Admin-Secret": secret },
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Ошибка загрузки");
      }
      const { url } = await res.json();
      return url;
    } finally {
      setUploading(false);
    }
  };
  return { upload, uploading };
}

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bonusProducts, setBonusProducts] = useState<Product[]>([]);
  const [bloggers, setBloggers] = useState<Blogger[]>([]);
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"orders" | "products" | "bonus" | "bloggers" | "users">("orders");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBlogger, setEditingBlogger] = useState<Blogger | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    pointsPrice: "",
    category: "flowers",
    imageUrl: "",
  });
  const [newBlogger, setNewBlogger] = useState({ nickname: "", avatarUrl: "" });

  const productFileRef = useRef<HTMLInputElement>(null);
  const bloggerFileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useAdminUpload(savedSecret);

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

  const loadProducts = () => {
    if (!savedSecret) return;
    setLoading(true);
    setError("");
    fetchAdmin<Product[]>("/api/admin/products", savedSecret)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadBonusProducts = () => {
    if (!savedSecret) return;
    setLoading(true);
    setError("");
    fetchAdmin<Product[]>("/api/admin/products?isFree=true", savedSecret)
      .then(setBonusProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadBloggers = () => {
    if (!savedSecret) return;
    setLoading(true);
    setError("");
    fetchAdmin<Blogger[]>("/api/admin/bloggers", savedSecret)
      .then(setBloggers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadUsers = () => {
    if (!savedSecret) return;
    setLoading(true);
    setError("");
    fetchAdmin<UserWithDetails[]>("/api/admin/users", savedSecret)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!savedSecret) return;
    if (tab === "orders") loadOrders();
    if (tab === "products") loadProducts();
    if (tab === "bonus") loadBonusProducts();
    if (tab === "bloggers") loadBloggers();
    if (tab === "users") loadUsers();
  }, [savedSecret, tab]);

  const confirmReferral = (orderId: number) => {
    if (!savedSecret) return;
    fetchAdmin(`/api/admin/orders/${orderId}/confirm-referral`, savedSecret, { method: "POST" })
      .then(() => loadOrders())
      .catch((err) => setError(err.message));
  };

  const handleProductFile = async (e: React.ChangeEvent<HTMLInputElement>, target: "product" | "blogger") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      if (target === "product") {
        if (editingProduct) setEditingProduct({ ...editingProduct, imageUrl: url });
        else setNewProduct((p) => ({ ...p, imageUrl: url }));
      } else {
        if (editingBlogger) setEditingBlogger({ ...editingBlogger, avatarUrl: url });
        else setNewBlogger((p) => ({ ...p, avatarUrl: url }));
      }
    } catch (err) {
      setError((err as Error).message);
    }
    e.target.value = "";
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
        price: parseInt(newProduct.price, 10) * 100,
        pointsPrice: newProduct.pointsPrice ? parseInt(newProduct.pointsPrice, 10) : null,
      }),
    })
      .then(() => {
        setNewProduct({ name: "", description: "", price: "", pointsPrice: "", category: "flowers", imageUrl: "" });
        loadProducts();
        if (tab === "bonus") loadBonusProducts();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const updateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedSecret || !editingProduct) return;
    setLoading(true);
    fetchAdmin(`/api/admin/products/${editingProduct.id}`, savedSecret, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        pointsPrice: editingProduct.pointsPrice,
        category: editingProduct.category,
        imageUrl: editingProduct.imageUrl,
      }),
    })
      .then(() => {
        setEditingProduct(null);
        loadProducts();
        loadBonusProducts();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const deleteProduct = (id: number) => {
    if (!savedSecret || !confirm("Удалить товар?")) return;
    fetchAdmin(`/api/admin/products/${id}`, savedSecret, { method: "DELETE" })
      .then(() => {
        loadProducts();
        loadBonusProducts();
      })
      .catch((err) => setError(err.message));
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
      .then(() => {
        setNewBlogger({ nickname: "", avatarUrl: "" });
        loadBloggers();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const updateBlogger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedSecret || !editingBlogger) return;
    setLoading(true);
    fetchAdmin(`/api/admin/bloggers/${editingBlogger.id}`, savedSecret, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: editingBlogger.nickname,
        avatarUrl: editingBlogger.avatarUrl,
      }),
    })
      .then(() => {
        setEditingBlogger(null);
        loadBloggers();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const deleteBlogger = (id: number) => {
    if (!savedSecret || !confirm("Удалить блогера?")) return;
    fetchAdmin(`/api/admin/bloggers/${id}`, savedSecret, { method: "DELETE" })
      .then(() => loadBloggers())
      .catch((err) => setError(err.message));
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

  if (loading && orders.length === 0 && products.length === 0 && bloggers.length === 0 && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const productForm = (product: typeof newProduct | Product, setProduct: (p: any) => void, isEdit: boolean) => (
    <>
      <div>
        <Label>Название</Label>
        <Input value={product.name} onChange={(e) => setProduct((p: any) => ({ ...p, name: e.target.value }))} required />
      </div>
      <div>
        <Label>Описание</Label>
        <Input
          value={product.description}
          onChange={(e) => setProduct((p: any) => ({ ...p, description: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label>Цена (₽)</Label>
        <Input
          type="number"
          value={isEdit ? (product as Product).price / 100 : (product as typeof newProduct).price}
          onChange={(e) =>
            setProduct((p: any) => ({
              ...p,
              price: isEdit ? parseInt(e.target.value, 10) * 100 : e.target.value,
            }))
          }
          required
        />
      </div>
      <div>
        <Label>Цена в баллах (пусто = нет)</Label>
        <Input
          type="number"
          value={product.pointsPrice ?? ""}
          onChange={(e) =>
            setProduct((p: any) => ({
              ...p,
              pointsPrice: isEdit ? (e.target.value ? parseInt(e.target.value, 10) : null) : e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>Категория</Label>
        <select
          value={product.category}
          onChange={(e) => setProduct((p: any) => ({ ...p, category: e.target.value }))}
          className="w-full rounded-lg border border-input bg-background px-4 py-2"
        >
          <option value="flowers">Цветы</option>
          <option value="8march">8 Марта</option>
          <option value="cakes">Торты</option>
          <option value="pastries">Пирожные</option>
        </select>
      </div>
      <div>
        <Label>Картинка</Label>
        <div className="flex gap-2">
          <Input
            value={product.imageUrl}
            onChange={(e) => setProduct((p: any) => ({ ...p, imageUrl: e.target.value }))}
            placeholder="URL или загрузите файл"
          />
          <input
            ref={productFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleProductFile(e, "product")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => productFileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </Button>
        </div>
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" className="mt-2 h-20 w-20 object-cover rounded-lg" />
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-5xl mx-auto">
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
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex justify-between items-center">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ["orders", "Заказы", ShoppingCart],
            ["products", "Товары", Package],
            ["bonus", "Товары за баллы", Gift],
            ["bloggers", "Блогеры", Users],
            ["users", "Пользователи", User],
          ] as const
        ).map(([t, label, Icon]) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            <Icon className="w-4 h-4" />
            {label}
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
                <Button onClick={() => confirmReferral(o.id)} disabled={loading} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Выдать 500 баллов рефереру
                </Button>
              )}
              {o.referralBonusGiven === 1 && <span className="text-sm text-green-600">Бонус выдан</span>}
            </div>
          ))}
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-6">
          {editingProduct ? (
            <form onSubmit={updateProduct} className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-xl">Редактировать товар</h3>
              {productForm(editingProduct, setEditingProduct, true)}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
                  Отмена
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={addProduct} className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-xl">Добавить товар</h3>
              {productForm(newProduct, setNewProduct, false)}
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Добавить"}
              </Button>
            </form>
          )}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-xl">Список товаров</h3>
            {products.map((p) => (
              <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={p.imageUrl} alt="" className="h-14 w-14 object-cover rounded-lg" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(p.price / 100).toFixed(0)} ₽
                      {p.pointsPrice != null && ` / ${p.pointsPrice} баллов`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingProduct(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteProduct(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "bonus" && (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Товары с ценой в баллах. Добавляйте и редактируйте в разделе «Товары», указав цену в баллах.
          </p>
          <Button onClick={loadBonusProducts} variant="outline" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Обновить"}
          </Button>
          <div className="space-y-3">
            {bonusProducts.map((p) => (
              <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={p.imageUrl} alt="" className="h-14 w-14 object-cover rounded-lg" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.pointsPrice} баллов</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(p);
                      setTab("products");
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteProduct(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "bloggers" && (
        <div className="space-y-6">
          {editingBlogger ? (
            <form onSubmit={updateBlogger} className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-xl">Редактировать блогера</h3>
              <div>
                <Label>Никнейм (без @)</Label>
                <Input
                  value={editingBlogger.nickname}
                  onChange={(e) => setEditingBlogger((b) => ({ ...b, nickname: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Аватар</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingBlogger.avatarUrl}
                    onChange={(e) => setEditingBlogger((b) => ({ ...b, avatarUrl: e.target.value }))}
                    placeholder="URL или загрузите"
                  />
                  <input
                    ref={bloggerFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleProductFile(e, "blogger")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bloggerFileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
                {editingBlogger.avatarUrl && (
                  <img src={editingBlogger.avatarUrl} alt="" className="mt-2 h-20 w-20 object-cover rounded-full" />
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingBlogger(null)}>
                  Отмена
                </Button>
              </div>
            </form>
          ) : (
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
                <Label>Аватар</Label>
                <div className="flex gap-2">
                  <Input
                    value={newBlogger.avatarUrl}
                    onChange={(e) => setNewBlogger((p) => ({ ...p, avatarUrl: e.target.value }))}
                    placeholder="URL или загрузите"
                  />
                  <input
                    ref={bloggerFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleProductFile(e, "blogger")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bloggerFileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
                {newBlogger.avatarUrl && (
                  <img src={newBlogger.avatarUrl} alt="" className="mt-2 h-20 w-20 object-cover rounded-full" />
                )}
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Добавить"}
              </Button>
            </form>
          )}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-xl">Список блогеров</h3>
            {bloggers.map((b) => (
              <div key={b.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={b.avatarUrl} alt="" className="h-14 w-14 object-cover rounded-full" />
                  <div className="font-medium">{b.nickname}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingBlogger(b)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteBlogger(b.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <Button onClick={loadUsers} variant="outline" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Обновить"}
          </Button>
          {users.map((u) => (
            <div key={u.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {u.avatarUrl && (
                    <img src={u.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="font-medium">
                      {u.tgUsername ? `@${u.tgUsername}` : u.username}
                      {u.firstName && ` (${u.firstName} ${u.lastName || ""})`.trim()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {u.id} | TG ID: {u.telegramId ?? "—"} | Баллы: {u.points} | Промокод: {u.referralCode}
                    </div>
                    {u.referrerId && (
                      <div className="text-sm text-primary">Ввёл промокод (реферер: {u.referrerId})</div>
                    )}
                  </div>
                </div>
              </div>
              {u.orders.length > 0 && (
                <div className="text-sm">
                  <strong>Заказы:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {u.orders.map((o) => (
                      <li key={o.id}>
                        {o.product?.name ?? "—"} — {(o.product?.price ?? 0) / 100} ₽ (
                        {o.paymentMethod === "points" ? "баллы" : "наличные"})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {u.referrals.length > 0 && (
                <div className="text-sm">
                  <strong>Рефералы ({u.referrals.length}):</strong>{" "}
                  {u.referrals.map((r) => r.username).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
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
