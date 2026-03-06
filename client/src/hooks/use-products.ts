import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useProducts(category?: string, isFree?: string) {
  return useQuery({
    queryKey: [api.products.list.path, category, isFree],
    queryFn: async () => {
      const url = new URL(api.products.list.path, window.location.origin);
      if (category) url.searchParams.set("category", category);
      if (isFree) url.searchParams.set("isFree", isFree);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await res.json();
      return api.products.list.responses[200].parse(data);
    },
  });
}
