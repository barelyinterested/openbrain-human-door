import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  photo?: string;
}

interface AuthState {
  authenticated: boolean;
  user?: AuthUser;
}

export function useAuth() {
  const { data, isLoading } = useQuery<AuthState>({
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
    user: data?.user,
  };
}
