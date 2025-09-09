import { useContext } from 'react';
import { AuthDataContext } from './AuthDataContext';
import type { AuthDataValue } from './AuthDataContextValue';

export const useAuthData = (): AuthDataValue => {
  const ctx = useContext(AuthDataContext);
  if (!ctx) throw new Error("useAuthData must be used within DataProvider");
  return ctx;
};
