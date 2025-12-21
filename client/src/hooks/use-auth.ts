import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "super_admin" | "org_admin" | "employee";
  organizationId: string | null;
}

interface AuthResponse {
  user: AuthUser | null;
  organization?: any;
}

async function fetchUser(): Promise<AuthResponse | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery<AuthResponse | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user/context"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; firstName?: string; lastName?: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user/context"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.setQueryData(["/api/user/context"], null);
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteData: { token: string; password: string; firstName?: string; lastName?: string }) => {
      const response = await apiRequest("POST", "/api/auth/accept-invite", inviteData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user/context"] });
    },
  });

  return {
    user: data?.user ?? null,
    organization: data?.organization ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    acceptInvite: acceptInviteMutation.mutateAsync,
    isAcceptingInvite: acceptInviteMutation.isPending,
  };
}
