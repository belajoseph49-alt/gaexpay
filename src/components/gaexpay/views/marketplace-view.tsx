"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Home as HomeIcon, ShoppingBag, CreditCard, MoreHorizontal,
  Heart, Star, Check, ChevronLeft, Tag, Truck, Plus,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---- Types -----------------------------------------------------------------

type SubView =
  | { kind: "home" }
  | { kind: "store"; storeId: string }
  | { kind: "product"; productId: string };

interface MarketplaceCategory {
  id: string;
  label: string;
  labelKey: string;
}
interface MarketplacePromo {
  id: string;
  brand: string;
  brandEmoji: string;
  title: string;
  percent: number;
  gradient: string;
  cta: string;
  code: string;
}
interface MarketplaceStore {
  id: string;
  name: string;
  emoji: string;
  logoBg: string;
  category: string;
  availability: string;
  productCount: number;
  rating: number;
  banner: string;
  tagline: string;
}
interface MarketplaceOffer {
  vendor: string;
  vendorEmoji: string;
  price: number;
  shipping: string;
  inStock: boolean;
  etaDays?: string;
}
interface MarketplaceProduct {
  id: string;
  storeId: string;
  title: string;
  subtitle: string;
  emoji: string;
  imageBg: string;
  category: string;
  subCategory: string;
  rating: number;
  reviews: number;
  priceNGN: number;
  oldPriceNGN?: number;
  popular: boolean;
  sizes?: string[];
  offers: MarketplaceOffer[];
}
interface MarketplaceData {
  categories: MarketplaceCategory[];
  promos: MarketplacePromo[];
  stores: MarketplaceStore[];
  products: MarketplaceProduct[];
}

// ---- Constants -------------------------------------------------------------

// Primary accent used throughout the marketplace (matches the video design).
// Kept as a named export so other modules can re-use the exact shade.
export const MARKETPLACE_PURPLE = "#6A11CB";
void MARKETPLACE_PURPLE; // referenced by Tailwind class strings below

// ---- Helpers ---------------------------------------------------------------

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fillPct = Math.max(0, Math.min(1, rating - (i - 1))) * 100;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-zinc-300" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPct}%` }}
            >
              <Star size={size} className="text-[#6A11CB] fill-[#6A11CB]" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ---- Bottom navigation (visual only) ---------------------------------------

function BottomNav() {
  const { setView } = useApp();
  const items = [
    { id: "home", label: "Home", icon: HomeIcon, onClick: () => setView("dashboard") },
    { id: "shop", label: "Shop", icon: ShoppingBag, active: true, onClick: () => {} },
    { id: "payment", label: "Payment", icon: CreditCard, onClick: () => setView("wallets") },
    { id: "more", label: "More", icon: MoreHorizontal, onClick: () => setView("settings") },
  ];
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 mt-6 border-t border-zinc-100 bg-white/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.active;
          return (
            <button
              key={it.id}
              onClick={it.onClick}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-[#6A11CB]" : "text-zinc-400 hover:text-zinc-600",
              )}
            >
              <Icon size={20} className={cn(active && "fill-[#6A11CB]")} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Search bar ------------------------------------------------------------

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus-visible:border-[#6A11CB] focus-visible:ring-[#6A11CB]/20"
      />
    </div>
  );
}

// ---- Category pills --------------------------------------------------------

function CategoryPills<T extends { id: string; label: string }>({
  categories,
  activeId,
  onSelect,
}: {
  categories: T[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:px-0">
      {categories.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
              active
                ? "bg-[#6A11CB] text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- Product card ----------------------------------------------------------

function ProductCard({
  product,
  onClick,
  fmt,
  t,
}: {
  product: MarketplaceProduct;
  onClick: () => void;
  fmt: (n: number) => string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [fav, setFav] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={cn("relative grid aspect-square place-items-center bg-gradient-to-br", product.imageBg)}>
        <span className="text-6xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110 sm:text-7xl">
          {product.emoji}
        </span>
        {product.popular && (
          <span className="absolute left-2 top-2 rounded-full bg-[#6A11CB] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            {t("marketplace.popular")}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFav((v) => !v);
          }}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/80 text-zinc-400 shadow-sm backdrop-blur transition-colors hover:text-rose-500"
          aria-label="Toggle favorite"
        >
          <Heart size={14} className={cn(fav && "fill-rose-500 text-rose-500")} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
          {product.title}
        </h3>
        <div className="flex items-center gap-1">
          <Stars rating={product.rating} />
          <span className="text-[11px] text-zinc-400">{product.rating.toFixed(1)}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-base font-bold text-zinc-900">{fmt(product.priceNGN)}</span>
          {product.oldPriceNGN && (
            <span className="text-xs text-zinc-400 line-through">{fmt(product.oldPriceNGN)}</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ---- Marketplace home ------------------------------------------------------

function MarketplaceHome({
  data,
  goStore,
  goProduct,
  fmt,
  t,
}: {
  data: MarketplaceData;
  goStore: (id: string) => void;
  goProduct: (id: string) => void;
  fmt: (n: number) => string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("popular");

  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.stores.filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [data.stores, query]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.products.filter((p) => {
      const matchQ = !q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchCat = activeCat === "popular" ? true : p.category.toLowerCase().includes(activeCat);
      return matchQ && matchCat;
    });
  }, [data.products, query, activeCat]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {t("marketplace.title")}
          </h1>
          <p className="text-sm text-zinc-500">{t("marketplace.subtitle")}</p>
        </div>
        <SearchBar value={query} onChange={setQuery} placeholder={t("marketplace.search")} />
      </div>

      {/* Category pills */}
      <CategoryPills categories={data.categories} activeId={activeCat} onSelect={setActiveCat} />

      {/* Promo cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">{t("marketplace.featured")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {data.promos.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                navigator.clipboard?.writeText(p.code);
                toast.success(t("marketplace.codeCopied"));
              }}
              className={cn(
                "relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-sm sm:h-36",
                p.gradient,
              )}
            >
              <div className="absolute -right-4 -top-4 text-7xl opacity-30 sm:text-8xl">
                {p.brandEmoji}
              </div>
              <div className="relative">
                <p className="text-xs font-medium text-white/80">{p.brand}</p>
                <p className="text-xl font-bold leading-tight sm:text-2xl">{p.title}</p>
              </div>
              <div className="relative flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                <Tag size={11} />
                <span>{p.cta}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Stores */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{t("marketplace.stores")}</h2>
          <p className="text-xs text-zinc-500">{t("marketplace.storesSubtitle")}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
          <AnimatePresence mode="popLayout">
            {filteredStores.map((s, i) => (
              <motion.button
                key={s.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => goStore(s.id)}
                className="flex w-full items-center gap-3 border-b border-zinc-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-zinc-50"
              >
                <div
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br text-2xl shadow-sm",
                    s.logoBg,
                  )}
                >
                  {s.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-900">{s.name}</p>
                  <p className="truncate text-xs text-zinc-500">{t("marketplace.onlineInStore")}</p>
                </div>
                <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check size={14} />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
          {filteredStores.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">No stores found.</div>
          )}
        </div>
      </section>

      {/* Product grid (filtered) */}
      {filteredProducts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900">{t("marketplace.popular")} picks</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.slice(0, 8).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ProductCard product={p} onClick={() => goProduct(p.id)} fmt={fmt} t={t} />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---- Store page ------------------------------------------------------------

function StorePage({
  data,
  store,
  onBack,
  goProduct,
  fmt,
  t,
}: {
  data: MarketplaceData;
  store: MarketplaceStore;
  onBack: () => void;
  goProduct: (id: string) => void;
  fmt: (n: number) => string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [activeSub, setActiveSub] = useState("sport-shoes");
  const products = data.products.filter((p) => p.storeId === store.id);
  const subCats = [
    { id: "sport-shoes", label: t("marketplace.sportShoes") },
    { id: "sneakers", label: t("marketplace.sneakers") },
  ];
  const visible = products.filter((p) =>
    activeSub === "sport-shoes"
      ? p.category.toLowerCase().includes("sport") || p.subCategory.toLowerCase().includes("sneaker")
      : p.subCategory.toLowerCase().includes("sneaker"),
  );

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-[#6A11CB]"
      >
        <ChevronLeft size={16} />
        {t("marketplace.back")}
      </button>

      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md sm:h-56 sm:p-6",
          store.banner,
        )}
      >
        <div className="absolute -right-6 -top-6 text-9xl opacity-25">{store.emoji}</div>
        <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br text-2xl ring-2 ring-white/30",
              store.logoBg,
            )}
          >
            {store.emoji}
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">{store.category}</p>
            <h1 className="text-2xl font-bold leading-tight">{store.name}</h1>
            <p className="text-xs text-white/80">{t("marketplace.onlineInStore")}</p>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="rounded-full bg-white text-[#6A11CB] shadow-sm hover:bg-white/90"
            onClick={() => toast.success(t("marketplace.codeCopied"))}
          >
            <Tag size={14} className="mr-1.5" />
            {t("marketplace.getCode")}
          </Button>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
            <Sparkles size={11} /> {store.rating.toFixed(1)} ★ · {store.productCount}+ products
          </span>
        </div>
      </motion.div>

      {/* Sub-category pills */}
      <CategoryPills categories={subCats} activeId={activeSub} onSelect={setActiveSub} />

      {/* Product count */}
      <p className="text-xs text-zinc-500">{t("marketplace.products", { count: store.productCount })}</p>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <ProductCard product={p} onClick={() => goProduct(p.id)} fmt={fmt} t={t} />
          </motion.div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
            No products in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Product detail --------------------------------------------------------

function ProductDetail({
  data,
  product,
  store,
  onBack,
  goProduct,
  fmt,
  t,
}: {
  data: MarketplaceData;
  product: MarketplaceProduct;
  store: MarketplaceStore | undefined;
  onBack: () => void;
  goProduct: (id: string) => void;
  fmt: (n: number) => string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [size, setSize] = useState<string | undefined>(product.sizes?.[0]);
  const [fav, setFav] = useState(false);

  const related = data.products
    .filter((p) => p.id !== product.id && (p.storeId === product.storeId || p.subCategory === product.subCategory))
    .slice(0, 4);

  // cheapest offer first
  const offers = [...product.offers].sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-[#6A11CB]"
      >
        <ChevronLeft size={16} />
        {t("marketplace.back")}
      </button>

      {/* Large product image */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative mx-auto grid aspect-square w-full max-w-md place-items-center overflow-hidden rounded-3xl bg-gradient-to-br shadow-sm sm:aspect-[4/3]",
          product.imageBg,
        )}
      >
        <span className="text-[10rem] drop-shadow-md sm:text-[12rem]">{product.emoji}</span>
        <button
          onClick={() => setFav((v) => !v)}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:text-rose-500"
          aria-label="Toggle favorite"
        >
          <Heart size={18} className={cn(fav && "fill-rose-500 text-rose-500")} />
        </button>
        {product.popular && (
          <span className="absolute left-4 top-4 rounded-full bg-[#6A11CB] px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {t("marketplace.popular")}
          </span>
        )}
      </motion.div>

      {/* Title + rating */}
      <div className="space-y-2">
        {store && (
          <button
            onClick={() => {}}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6A11CB]"
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br text-[10px]",
                store.logoBg,
              )}
            >
              {store.emoji}
            </span>
            {store.name}
          </button>
        )}
        <h1 className="text-xl font-bold leading-tight text-zinc-900 sm:text-2xl">
          {product.title}
        </h1>
        <p className="text-sm text-zinc-500">{product.subtitle}</p>
        <div className="flex items-center gap-2">
          <Stars rating={product.rating} size={16} />
          <span className="text-sm font-medium text-zinc-700">
            {t("marketplace.rating", { rating: product.rating.toFixed(1) })}
          </span>
          <span className="text-xs text-zinc-400">· {product.reviews.toLocaleString()} reviews</span>
        </div>
      </div>

      {/* Size selector */}
      {product.sizes && product.sizes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-900">{t("marketplace.size")}</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const active = s === size;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={cn(
                    "min-w-[44px] rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                    active
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price comparison */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-900">{t("marketplace.priceComparison")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {offers.map((o, i) => (
            <motion.div
              key={o.vendor}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card
                className={cn(
                  "relative flex flex-col gap-3 p-4 shadow-sm",
                  i === 0 ? "border-emerald-200 ring-1 ring-emerald-100" : "border-zinc-100",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-base">
                    {o.vendorEmoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900">{o.vendor}</p>
                    <p className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Truck size={11} />
                      {o.shipping}
                    </p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold text-zinc-900">{fmt(o.price)}</p>
                    {i === 0 && (
                      <p className="text-[11px] font-medium text-emerald-600">
                        Save {fmt(product.offers[1].price - o.price)}
                      </p>
                    )}
                  </div>
                  {o.inStock ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <Check size={11} /> {t("marketplace.inStock")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                      Out of stock
                    </span>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
          onClick={() => toast.success(t("marketplace.addedToCart"))}
        >
          <Plus size={16} className="mr-1.5" />
          {t("marketplace.addToCart")}
        </Button>
        <Button
          size="lg"
          className="rounded-xl bg-zinc-900 text-white shadow-sm hover:bg-zinc-800"
          onClick={() => toast.success(t("marketplace.buyNow"))}
        >
          {t("marketplace.buyNow")}
        </Button>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-base font-semibold text-zinc-900">{t("marketplace.relatedProducts")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => goProduct(p.id)} fmt={fmt} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---- Loading skeleton ------------------------------------------------------

function MarketplaceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-40 bg-zinc-100" />
        <Skeleton className="h-11 w-full rounded-xl bg-zinc-100" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full bg-zinc-100" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-36 rounded-2xl bg-zinc-100" />
        <Skeleton className="h-36 rounded-2xl bg-zinc-100" />
      </div>
      <Skeleton className="h-8 w-24 bg-zinc-100" />
      <div className="overflow-hidden rounded-2xl border border-zinc-100">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-none border-b border-zinc-50 bg-zinc-50" />
        ))}
      </div>
    </div>
  );
}

// ---- Main view -------------------------------------------------------------

export function MarketplaceView() {
  const { t } = useTranslation();
  const { fmt } = useFormatMoney();
  const { data, loading } = useFetch<MarketplaceData>("/api/marketplace/products");
  const [sub, setSub] = useState<SubView>({ kind: "home" });

  const goStore = (storeId: string) => setSub({ kind: "store", storeId });
  const goProduct = (productId: string) => setSub({ kind: "product", productId });
  const goHome = () => setSub({ kind: "home" });

  const fmtNGN = (n: number) => fmt(n);

  return (
    // The marketplace always renders in a white "shopping app" surface,
    // regardless of the global dark/light theme. This matches the video design.
    <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-white text-zinc-900 lg:mb-0">
      <div className="mx-auto max-w-3xl px-4 pb-6 pt-4 lg:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={sub.kind + (sub.kind === "store" ? sub.storeId : sub.kind === "product" ? sub.productId : "")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            {loading || !data ? (
              <MarketplaceSkeleton />
            ) : sub.kind === "home" ? (
              <MarketplaceHome
                data={data}
                goStore={goStore}
                goProduct={goProduct}
                fmt={fmtNGN}
                t={t}
              />
            ) : sub.kind === "store" ? (
              <StorePage
                data={data}
                store={data.stores.find((s) => s.id === sub.storeId)!}
                onBack={goHome}
                goProduct={goProduct}
                fmt={fmtNGN}
                t={t}
              />
            ) : (
              <ProductDetail
                data={data}
                product={data.products.find((p) => p.id === sub.productId)!}
                store={data.stores.find((s) => s.id === data.products.find((p) => p.id === sub.productId)?.storeId)}
                onBack={() => {
                  // back from product detail → return to store if known
                  const prod = data.products.find((p) => p.id === sub.productId);
                  if (prod) setSub({ kind: "store", storeId: prod.storeId });
                  else goHome();
                }}
                goProduct={goProduct}
                fmt={fmtNGN}
                t={t}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
