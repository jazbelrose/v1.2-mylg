import type { UserLite } from "./DataProvider";
import type { updateUserProfile } from "../../shared/utils/api";

export interface AuthDataValue {
  user?: UserLite | null;
  userId?: string;
  userName: string;
  allUsers: UserLite[];
  userData: UserLite | null;
  setUserData: React.Dispatch<React.SetStateAction<UserLite | null>>;
  refreshUsers: () => Promise<void>;
  updateUserProfile: typeof updateUserProfile;
  isAdmin: boolean;
  isDesigner: boolean;
  isBuilder: boolean;
  isVendor: boolean;
  isClient: boolean;
}
