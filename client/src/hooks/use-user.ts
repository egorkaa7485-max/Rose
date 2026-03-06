import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useUser() {
  return useQuery({
    queryKey: [api.user.me.path],
    queryFn: async () => {
      const res = await fetch(api.user.me.path, { credentials: "include" });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      return api.user.me.responses[200].parse(data);
    },
    retry: false,
  });
}

export function useApplyReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(api.user.useReferral.path, {
        method: api.user.useReferral.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Invalid referral code");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.user.me.path] });
    },
  });
}
