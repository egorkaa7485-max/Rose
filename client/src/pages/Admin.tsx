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
  MessageCircle,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ADMIN_KEY = "admin_secret";

type Order = {
  id: number;
  userId: number;
  productId: number;
  referrerId: number | null;
  referralBonusGiven: number;
  status: string;
  paymentMethod?: string;
  createdAt?: string;
  user: { id: number; username: string } | null;
  referrer: { id: number; username: string; referralCode: string } | null;
  product: { id: number; name: string } | null;
};

type OrderDetail = Order & {
  user: {
    id: number;
    username: string;
    telegramId: number | null;
    tgUsername: string | null;
    firstName: string | null;
    lastName: string | null;
    referralCode: string;
  } | null;
  referrer: { id: number; username: string; referralCode: string } | null;
  product: Product | null;
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
  const [tab, setTab] = useState<"orders" | "products" | "bonus" | "bloggers" | "users" | "gift" | "broadcast">("orders");
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [giftCodes, setGiftCodes] = useState<any[]>([]);
  const [giftOrders, setGiftOrders] = useState<any[]>([]);
  const [editingUserPoints, setEditingUserPoints] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBlogger, setEditingBlogger] = useState<Blogger | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [userMessageText, setUserMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

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

  const loadGiftCodes = () => {
    if (!savedSecret) return;
    setLoading(true);
    fetchAdmin<any[]>("/api/admin/gift-codes", savedSecret)
      .then(setGiftCodes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadGiftOrders = () => {
    if (!savedSecret) return;
    setLoading(true);
    fetchAdmin<any[]>("/api/admin/gift-orders", savedSecret)
      .then(setGiftOrders)
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
    if (tab === "gift") {
      loadGiftCodes();
      loadGiftOrders();
    }
  }, [savedSecret, tab]);

  useEffect(() => {
    if (!savedSecret || !selectedOrderId) {
      setOrderDetail(null);
      return;
    }
    fetchAdmin<OrderDetail>(`/api/admin/orders/${selectedOrderId}`, savedSecret)
      .then(setOrderDetail)
      .catch(() => setOrderDetail(null));
  }, [savedSecret, selectedOrderId]);

  useEffect(() => {
    if (selectedUser) setEditingUserPoints(String(selectedUser.points));
  }, [selectedUser]);

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

  if (loading && tab !== "broadcast" && orders.length === 0 && products.length === 0 && bloggers.length === 0 && users.length === 0 && giftCodes.length === 0 && giftOrders.length === 0) {
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
            ["gift", "Коды подарков", KeyRound],
            ["broadcast", "Рассылка", MessageCircle],
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
            <button
              type="button"
              key={o.id}
              onClick={() => setSelectedOrderId(o.id)}
              className="w-full text-left glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 hover:ring-2 hover:ring-primary/30 transition-all"
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmReferral(o.id);
                  }}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Выдать 500 баллов рефереру
                </Button>
              )}
              {o.referralBonusGiven === 1 && <span className="text-sm text-green-600">Бонус выдан</span>}
            </button>
          ))}
        </div>
      )}

      {/* Диалог детали заказа */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Заказ #{orderDetail?.id ?? selectedOrderId}</DialogTitle>
          </DialogHeader>
          {orderDetail ? (
            <div className="space-y-4 text-sm">
              <div>
                <strong>Пользователь:</strong>
                <div className="mt-1 text-muted-foreground">
                  {orderDetail.user ? (
                    <>
                      {orderDetail.user.tgUsername ? `@${orderDetail.user.tgUsername}` : orderDetail.user.username}
                      {orderDetail.user.firstName && ` (${orderDetail.user.firstName} ${orderDetail.user.lastName || ""})`.trim()}
                      <br />
                      ID: {orderDetail.user.id} | TG ID: {orderDetail.user.telegramId ?? "—"} | Промокод: {orderDetail.user.referralCode}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div>
                <strong>Товар:</strong>
                <div className="mt-1">
                  {orderDetail.product ? (
                    <>
                      <div className="font-medium">{orderDetail.product.name}</div>
                      <div className="text-muted-foreground">{orderDetail.product.description}</div>
                      <div className="mt-1">
                        {(orderDetail.product.price / 100).toFixed(0)} ₽
                        {orderDetail.product.pointsPrice != null && ` / ${orderDetail.product.pointsPrice} баллов`}
                      </div>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div>
                <strong>Оплата:</strong> {orderDetail.paymentMethod === "points" ? "баллы" : "наличные"}
              </div>
              <div>
                <strong>Промокод использован:</strong>{" "}
                {orderDetail.referrerId ? (
                  <>Да — привёл {orderDetail.referrer?.username} (код {orderDetail.referrer?.referralCode})</>
                ) : (
                  "Нет"
                )}
              </div>
              {orderDetail.referrerId && (
                <div>
                  <strong>Бонус рефереру:</strong>{" "}
                  {orderDetail.referralBonusGiven ? "Выдан" : "Не выдан"}
                </div>
              )}
              <div>
                <strong>Статус:</strong> {orderDetail.status}
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог написать пользователю + редактировать баллы */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setUserMessageText("");
            setEditingUserPoints("");
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.tgUsername ? `@${selectedUser.tgUsername}` : selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div>
                <Label>Баллы</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={editingUserPoints === "" ? selectedUser.points : editingUserPoints}
                    onChange={(e) => setEditingUserPoints(e.target.value)}
                    min={0}
                    className="w-24"
                  />
                  <Button
                    onClick={() => {
                      if (!savedSecret || !selectedUser) return;
                      const pts = editingUserPoints === "" ? selectedUser.points : parseInt(editingUserPoints, 10);
                      if (isNaN(pts) || pts < 0) {
                        setError("Введите число >= 0");
                        return;
                      }
                      fetchAdmin(`/api/admin/users/${selectedUser.id}`, savedSecret, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ points: pts }),
                      })
                        .then(() => {
                          setSelectedUser({ ...selectedUser, points: pts });
                          loadUsers();
                        })
                        .catch((err) => setError(err.message));
                    }}
                  >
                    Сохранить баллы
                  </Button>
                </div>
              </div>
              <div>
                <Label>Написать в Telegram</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedUser.telegramId ? (
                    "Сообщение придёт в личные сообщения."
                  ) : (
                    "У пользователя нет Telegram. Отправка недоступна."
                  )}
                </div>
                {selectedUser.telegramId && (
                  <>
                    <Textarea
                      value={userMessageText}
                      onChange={(e) => setUserMessageText(e.target.value)}
                      placeholder="Введите сообщение..."
                      rows={4}
                      className="resize-none mt-2"
                    />
                    <Button
                      onClick={() => {
                        if (!savedSecret || !selectedUser || !userMessageText.trim()) return;
                        setSendingMessage(true);
                        fetchAdmin(`/api/admin/users/${selectedUser.id}/send-message`, savedSecret, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ text: userMessageText.trim() }),
                        })
                          .then(() => {
                            setError("");
                            setUserMessageText("");
                          })
                          .catch((err) => setError(err.message))
                          .finally(() => setSendingMessage(false));
                      }}
                      disabled={sendingMessage || !userMessageText.trim()}
                      className="mt-2"
                    >
                      {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                      Отправить
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <button
              type="button"
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="w-full text-left glass rounded-2xl p-4 space-y-3 hover:ring-2 hover:ring-primary/30 transition-all"
            >
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
            </button>
          ))}
        </div>
      )}

      {tab === "broadcast" && (
        <div className="space-y-4 max-w-xl">
          <p className="text-sm text-muted-foreground">
            Сообщение будет отправлено в Telegram всем пользователям, у которых указан Telegram ID.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!savedSecret || !broadcastText.trim()) return;
              setBroadcastLoading(true);
              setBroadcastResult(null);
              try {
                const data = await fetchAdmin<{ message: string; sent: number; failed: number; total: number }>(
                  "/api/admin/broadcast",
                  savedSecret,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: broadcastText.trim() }),
                  }
                );
                setBroadcastResult(data.message);
                setBroadcastText("");
              } catch (err) {
                setBroadcastResult((err as Error).message);
              } finally {
                setBroadcastLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Текст сообщения</Label>
              <Textarea
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Введите текст рассылки..."
                rows={5}
                className="mt-1 bg-background"
                required
              />
            </div>
            <Button type="submit" disabled={broadcastLoading || !broadcastText.trim()} className="gap-2">
              {broadcastLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {broadcastLoading ? "Отправка…" : "Отправить всем"}
            </Button>
          </form>
          {broadcastResult && (
            <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted">{broadcastResult}</p>
          )}
        </div>
      )}

      {tab === "gift" && (
        <div className="space-y-6">
          <Button
            onClick={() => {
              loadGiftCodes();
              loadGiftOrders();
            }}
            variant="outline"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Обновить"}
          </Button>
          <div>
            <h3 className="font-display font-bold text-xl mb-3">Коды подарков (кто создал)</h3>
            <div className="space-y-2">
              {giftCodes.map((gc) => (
                <div key={gc.id} className="glass rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <code className="font-mono font-bold text-primary">{gc.code}</code>
                    <div className="text-sm text-muted-foreground mt-1">
                      Создал: {gc.user?.tgUsername ? `@${gc.user.tgUsername}` : gc.user?.username ?? "—"} (ID {gc.userId}) · Подарков: {gc.ordersCount ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {gc.createdAt ? new Date(gc.createdAt).toLocaleString("ru") : ""}
                    </div>
                  </div>
                </div>
              ))}
              {giftCodes.length === 0 && <p className="text-muted-foreground">Нет кодов</p>}
            </div>
          </div>
          <div>
            <h3 className="font-display font-bold text-xl mb-3">Подарки (кто кому отправил)</h3>
            <div className="space-y-2">
              {giftOrders.map((go) => (
                <div key={go.id} className="glass rounded-xl p-4">
                  <div className="font-medium">
                    {go.sender?.tgUsername ? `@${go.sender.tgUsername}` : go.sender?.username ?? "—"} → {go.recipient?.tgUsername ? `@${go.recipient.tgUsername}` : go.recipient?.username ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Товар: {go.product?.name ?? "—"} · {(go.product?.price ?? 0) / 100} ₽
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {go.createdAt ? new Date(go.createdAt).toLocaleString("ru") : ""}
                  </div>
                </div>
              ))}
              {giftOrders.length === 0 && <p className="text-muted-foreground">Нет подарков</p>}
            </div>
          </div>
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
