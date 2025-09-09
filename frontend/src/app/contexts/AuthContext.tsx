// src/app/contexts/AuthContext.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  PropsWithChildren,
  useMemo,
} from "react";
import {
  fetchAuthSession,
  getCurrentUser as amplifyGetCurrentUser,
  updateUserAttributes,
  signOut,
} from "aws-amplify/auth";
import { fetchUserProfile as fetchUserProfileApi } from "../../shared/utils/api";
import { secureWebSocketAuth } from "../../shared/utils/secureWebSocketAuth";
import { csrfProtection, logSecurityEvent } from "../../shared/utils/securityUtils";
import { AuthContext, AuthContextValue, AuthStatus, Role, UserProfile } from "./AuthContextValue";

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("signedOut");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug (keep while migrating; remove later)
  useEffect(() => {
     
    console.log("[AuthContext]", { isAuthenticated, authStatus, user, loading });
  }, [isAuthenticated, authStatus, user, loading]);

  const refreshUser = useCallback(async () => {
    try {
      const cognitoUser = await amplifyGetCurrentUser();
      if (!cognitoUser) throw new Error("No current user");

      const session = await fetchAuthSession();
      const role = (session.tokens?.idToken?.payload?.role as Role) ?? undefined;
      const userId = (session.tokens?.idToken?.payload?.sub as string) ?? cognitoUser.username;

      const userProfile = (await fetchUserProfileApi(userId)) as UserProfile | null;
      setUser({
        ...(userProfile ?? { userId }),
        userId,
        role,
        // keep a cognito ref if you need it: cognitoUsername: cognitoUser.username
      });
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    }
  }, []);

  const validateAndSetUserSession = useCallback(async (label = "default") => {
    try {
      const session = await fetchAuthSession();
      const { accessToken, idToken } = session.tokens ?? {};
      if (!accessToken || !idToken) {
        setAuthStatus("signedOut");
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const now = Date.now();
      const accessExp = (accessToken.payload.exp as number) * 1000;
      const idExp = (idToken.payload.exp as number) * 1000;
      if (accessExp <= now || idExp <= now) {
        setAuthStatus("signedOut");
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const cognitoUser = await amplifyGetCurrentUser();
      const role = (idToken.payload?.role as Role) ?? undefined;
      const userId = (idToken.payload?.sub as string) ?? cognitoUser?.username;

      let userProfile: UserProfile | null = null;
      try {
        const res = await fetchUserProfileApi(userId);
        // some backends return { Item: {...} }
        userProfile = (res as { Item?: UserProfile })?.Item ?? (res as UserProfile) ?? null;
      } catch (e) {
        console.error(`[validateAndSetUserSession:${label}] profile fetch error:`, e);
      }

      if (!userProfile) {
        // still treat as signed-in so app can prompt to complete profile
        setAuthStatus("signedIn");
        setIsAuthenticated(true);
        setUser({ userId, role });
        return;
      }

      if (!userProfile.firstName) {
        setAuthStatus("incompleteProfile");
        setIsAuthenticated(true);
        setUser({ ...userProfile, userId, role });
        return;
      }

      setIsAuthenticated(true);
      setAuthStatus("signedIn");
      setUser({ ...userProfile, userId, role });
    } catch (error) {
      console.error(`[validateAndSetUserSession:${label}] Error:`, error);
      setAuthStatus("signedOut");
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  const getAuthTokens = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session?.tokens) throw new Error("No session tokens found");
      return session.tokens;
    } catch (error) {
      console.error("Error fetching auth session:", error);
      return null;
    }
  }, []);

  const globalSignOut = useCallback(async () => {
    try {
      await signOut({ global: true });
      setIsAuthenticated(false);
      setUser(null);
      secureWebSocketAuth.clearAllTokens();
      csrfProtection.clearToken();
      logSecurityEvent("user_logged_out");
    } catch (error: unknown) {
      console.error("Error during global sign out:", error);
      logSecurityEvent("logout_error", { error: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  // periodic check
  useEffect(() => {
    validateAndSetUserSession();
    const id = setInterval(validateAndSetUserSession, 1000 * 60 * 45);
    return () => clearInterval(id);
  }, [validateAndSetUserSession]);

  // initial
  useEffect(() => {
    (async () => {
      try {
        await validateAndSetUserSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [validateAndSetUserSession]);

  // ---- derived values (memoized) ----
  const userId = user?.userId;
  const role = user?.role;
  const userName = user?.firstName ? `${user.firstName} ` : "Guest";

  const isAdmin = role === "admin";
  const isDesigner = role === "designer";
  const isBuilder = role === "builder";
  const isVendor = role === "vendor";
  const isClient = role === "client";

  const value = useMemo<AuthContextValue>(
    () => ({
      // state
      isAuthenticated,
      authStatus,
      user,
      loading,

      // derived
      userId,
      userName,
      role,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,

      // actions
      setIsAuthenticated,
      setAuthStatus,
      setUser,
      refreshUser,
      validateAndSetUserSession,
      getCurrentUser: amplifyGetCurrentUser,
      getAuthTokens,
      globalSignOut,
      updateUserCognitoAttributes: async (userAttributes: Record<string, string>) => {
        await amplifyGetCurrentUser();
        await updateUserAttributes({ userAttributes });
      },
    }),
    [
      isAuthenticated,
      authStatus,
      user,
      loading,
      userId,
      userName,
      role,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,
      refreshUser,
      validateAndSetUserSession,
      getAuthTokens,
      globalSignOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
