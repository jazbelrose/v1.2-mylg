import type { ProjectLike } from "@/dashboard/dashboard/hooks/useProjectKpis";

export type ProjectWithMeta = ProjectLike & {
  _activity: number;
  _created: number;
  team?: Array<{
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>;
  unreadCount?: number;
};




