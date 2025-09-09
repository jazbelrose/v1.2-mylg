// src/app/contexts/UserProvider.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  PropsWithChildren,
} from "react";
import { useAuth } from "./useAuth";
import {
  fetchAllUsers,
  fetchUserProfile as fetchUserProfileApi,
  updateUserProfile,
} from "../../shared/utils/api";
import { UserContext } from "./UserContext";
import type { UserContextValue } from "./UserContextValue";
import type { UserLite } from "./DataProvider";

export const UserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { userId } = useAuth();

  const [user, setUser] = useState<UserLite | null>(null);
  const [allUsers, setAllUsers] = useState<UserLite[]>([]);

  // Load all users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await fetchAllUsers();
        const mapped = Array.isArray(users)
          ? (users as UserLite[]).map((u) => ({ ...u, occupation: u.occupation || u.role }))
          : [];
        setAllUsers(mapped);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    if (userId) {
      loadUsers();
    }
  }, [userId]);

  const refreshUsers = async () => {
    try {
      const users = await fetchAllUsers();
      const mapped = Array.isArray(users)
        ? (users as UserLite[]).map((u) => ({ ...u, occupation: u.occupation || u.role }))
        : [];
      setAllUsers(mapped);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Load user profile
  const fetchUserProfile = useCallback(async () => {
    if (!userId) {
      setUser(null);
      return;
    }
    try {
      const profile = await fetchUserProfileApi(userId);
      const mappedProfile = profile
        ? ({
            ...profile,
            occupation: (profile as UserLite).occupation || (profile as UserLite).role,
          } as UserLite)
        : null;

      setUser({
        ...(mappedProfile ?? ({} as UserLite)),
        messages: (mappedProfile as UserLite | null)?.messages || [],
        userId,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, fetchUserProfile]);

  // Derived role checks based on user profile
  const role = user?.role || user?.occupation;
  const isAdmin = role === "admin";
  const isDesigner = role === "designer";
  const isBuilder = role === "builder";
  const isVendor = role === "vendor";
  const isClient = role === "client";

  // Backward compatibility
  const userName = user?.firstName ? `${user.firstName} ` : "Guest";
  const userData = user; // alias for backward compatibility
  const setUserData = setUser; // alias for backward compatibility
  const refreshUser = fetchUserProfile; // alias for backward compatibility

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      allUsers,
      userId,
      userName,
      userData,
      setUserData,
      setUser,
      refreshUsers,
      refreshUser,
      updateUserProfile,
      fetchUserProfile,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,
    }),
    [
      user,
      allUsers,
      userId,
      userName,
      userData,
      setUserData,
      refreshUser,
      fetchUserProfile,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,
    ]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};