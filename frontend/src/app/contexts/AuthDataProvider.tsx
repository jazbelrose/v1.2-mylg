// src/app/contexts/AuthDataProvider.tsx
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
import { AuthDataContext } from "./AuthDataContext";
import type { AuthDataValue } from "./AuthDataContextValue";
import type { UserLite } from "./DataProvider";

export const AuthDataProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { user, userId, userName, isAdmin, isDesigner, isBuilder, isVendor, isClient } = useAuth();

  const [allUsers, setAllUsers] = useState<UserLite[]>([]);
  const [userData, setUserData] = useState<UserLite | null>(null);

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
      setUserData(null);
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

      setUserData({
        ...(mappedProfile ?? ({} as UserLite)),
        messages: (mappedProfile as UserLite | null)?.messages || [],
        userId: user?.userId,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [userId, user]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, fetchUserProfile]);

  const authValue = useMemo<AuthDataValue>(
    () => ({
      user,
      userId,
      userName,
      allUsers,
      userData,
      setUserData,
      refreshUsers,
      updateUserProfile,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,
    }),
    [
      user,
      userId,
      userName,
      allUsers,
      userData,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,
    ]
  );

  return (
    <AuthDataContext.Provider value={authValue}>
      {children}
    </AuthDataContext.Provider>
  );
};