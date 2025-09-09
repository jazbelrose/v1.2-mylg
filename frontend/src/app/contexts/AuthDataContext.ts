import { createContext } from "react";
import type { AuthDataValue } from "./AuthDataContextValue";

export const AuthDataContext = createContext<AuthDataValue | undefined>(undefined);
