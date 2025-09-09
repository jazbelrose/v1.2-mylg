import { useAuthData } from "./useAuthData";
import { useProjects } from "./useProjects";
import { useMessages } from "./useMessages";
import type { AuthDataValue } from "./AuthDataContextValue";
import type { ProjectsValue } from "./ProjectsContextValue";
import type { MessagesValue } from "./MessagesContextValue";

type DataValue = AuthDataValue & ProjectsValue & MessagesValue;

export const useData = (): DataValue => ({
  ...useAuthData(),
  ...useProjects(),
  ...useMessages(),
});
