import type { UserLite } from "./DataProvider";
import type { updateUserProfile } from "../../shared/utils/api";

export interface UserContextValue {
  // User profile data (business-level, stored in DynamoDB/backend)
  user: UserLite | null;
  allUsers: UserLite[];
  
  // Actions
  setUser: React.Dispatch<React.SetStateAction<UserLite | null>>;
  refreshUsers: () => Promise<void>;
  updateUserProfile: typeof updateUserProfile;
  fetchUserProfile: () => Promise<void>;
  
  // Derived role checks (from user profile)
  isAdmin: boolean;
  isDesigner: boolean;
  isBuilder: boolean;
  isVendor: boolean;
  isClient: boolean;
}