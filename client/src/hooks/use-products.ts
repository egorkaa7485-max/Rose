import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export type UseProductsParams = {
  category?: string;
  isFree?: string;
  priceFrom?: number;
  priceTo?: number;
  search?: string;
};

export function useProducts(category?: string, isFree?: string, priceFrom?: number, priceTo?: number, search?: string) {
  return useQuery({
    queryKey: [api.products.list.path, category, isFree, priceFrom, priceTo, search],
    queryFn: async () => {
      const url = new URL(api.products.list.path, window.location.origin);
      if (category) url.searchParams.set("category", category);
      if (isFree) url.searchParams.set("isFree", isFree);
      if (priceFrom != null) url.searchParams.set("priceFrom", String(priceFrom));
      if (priceTo != null) url.searchParams.set("priceTo", String(priceTo));
      if (search?.trim()) url.searchParams.set("search", search.trim());

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      return api.products.list.responses[200].parse(data);
    },
  });
}
