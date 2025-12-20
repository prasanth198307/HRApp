import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppUser, Organization } from "@shared/schema";

interface UserContextType {
  appUser: AppUser | null;
  organization: Organization | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isEmployee: boolean;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { data, isLoading, refetch } = useQuery<{ appUser: AppUser; organization: Organization | null }>({
    queryKey: ["/api/user/context"],
  });

  const appUser = data?.appUser ?? null;
  const organization = data?.organization ?? null;

  const value: UserContextType = {
    appUser,
    organization,
    isLoading,
    isSuperAdmin: appUser?.role === "super_admin",
    isOrgAdmin: appUser?.role === "org_admin",
    isEmployee: appUser?.role === "employee",
    refetch,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
