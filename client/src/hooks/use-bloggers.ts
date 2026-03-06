import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type CreateBloggerGiftRequest } from "@shared/schema";

export function useBloggers() {
  return useQuery({
    queryKey: [api.bloggers.list.path],
    queryFn: async () => {
      const res = await fetch(api.bloggers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bloggers");
      const data = await res.json();
      return api.bloggers.list.responses[200].parse(data);
    },
  });
}

export function useSendBloggerGift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateBloggerGiftRequest) => {
      const res = await fetch(api.bloggerGifts.create.path, {
        method: api.bloggerGifts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send gift");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate relevant user queries to update points or history if needed
      queryClient.invalidateQueries({ queryKey: [api.user.me.path] });
    },
  });
}
