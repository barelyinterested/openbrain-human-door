import { useQuery } from "@tanstack/react-query";

interface AuthState {
  authenticated: boolean;
  user_id?: string;
  email?: string;
}

export function useAuth() {
  const { data, isLoading, refetch } = useQuery<AuthState>({
    queryKey: ["/auth/me"],
    queryFn: async () => {
      const res = await fetch("/auth/me");
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  return {
    isLoading,
    isAuthenticated: data?.authenticated ?? false,
    user_id: data?.user_id,
    email: data?.email,
    refetch,
  };
}
