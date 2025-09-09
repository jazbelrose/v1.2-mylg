import { createContext } from "react";
import { fetchAuthSession, getCurrentUser as amplifyGetCurrentUser } from "aws-amplify/auth";

/** ---- Types (pragmatic; tighten as your models evolve) ---- */
export type Role = "admin" | "designer" | "builder" | "vendor" | "client" | string;

export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  occupation?: string;
  // add any other fields you store in the user profile
  [k: string]: unknown;
}

export type AuthStatus = "signedOut" | "signedIn" | "incompleteProfile";

export interface AuthContextValue {
  // state
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  user: UserProfile | null;
  loading: boolean;

  // derived
  userId?: string;
  userName: string;
  role?: Role;
  isAdmin: boolean;
  isDesigner: boolean;
  isBuilder: boolean;
  isVendor: boolean;
  isClient: boolean;

  // actions
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  setAuthStatus: React.Dispatch<React.SetStateAction<AuthStatus>>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshUser: (forceRefresh?: boolean) => Promise<void>;
  validateAndSetUserSession: (label?: string) => Promise<void>;
  getCurrentUser: typeof amplifyGetCurrentUser;
  getAuthTokens: () => Promise<Awaited<ReturnType<typeof fetchAuthSession>>["tokens"] | null>;
  globalSignOut: () => Promise<void>;
  updateUserCognitoAttributes: (userAttributes: Record<string, string>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
