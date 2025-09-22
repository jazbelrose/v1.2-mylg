import { useEffect, useState } from "react";

import { fetchUserProfilesBatch, getFileUrl, type UserProfile } from "@/shared/utils/api";

import type { Project } from "@/app/contexts/DataProvider";
import type { TeamMember } from "../../types";

const teamMembersCache = new Map<string, TeamMember[]>();

export function useProjectTeamMembers(
  activeProjectId: string | undefined,
  team: Project["team"] | undefined
): TeamMember[] {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (activeProjectId && teamMembersCache.has(activeProjectId)) {
      return teamMembersCache.get(activeProjectId) as TeamMember[];
    }
    return [];
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!activeProjectId || !Array.isArray(team)) {
        if (isMounted) {
          setTeamMembers([]);
          if (activeProjectId) {
            teamMembersCache.set(activeProjectId, []);
          }
        }
        return;
      }

      try {
        const ids = team.map((member) => member.userId);
        const profiles = await fetchUserProfilesBatch(ids);
        const map = new Map(profiles.map((profile: UserProfile) => [profile.userId, profile]));
        const results: TeamMember[] = team.map((member) => {
          const profile = map.get(member.userId);
          return {
            ...member,
            name: profile?.displayName || `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim(),
            thumbnail: profile?.thumbnailKey || member.thumbnail,
          };
        });

        if (isMounted) {
          setTeamMembers(results);
          teamMembersCache.set(activeProjectId, results);
        }
      } catch {
        if (isMounted) {
          setTeamMembers([]);
          teamMembersCache.set(activeProjectId ?? "", []);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [activeProjectId, team]);

  useEffect(() => {
    teamMembers.forEach((member) => {
      if (member.thumbnail) {
        const img = new Image();
        img.src = getFileUrl(member.thumbnail);
      }
    });
  }, [teamMembers]);

  return teamMembers;
}
