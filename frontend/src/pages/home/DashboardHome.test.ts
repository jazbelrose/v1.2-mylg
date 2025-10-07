import { describe, expect, it } from "vitest";

import {
  PROJECTS_OVERVIEW_VIEW,
  parseDashboardPath,
} from "../../dashboard/home/pages/DashboardHome";

describe("parseDashboardPath", () => {
  it("returns the projects overview view by default", () => {
    expect(parseDashboardPath("/dashboard")).toEqual({
      view: PROJECTS_OVERVIEW_VIEW,
      userSlug: null,
    });
  });

  it("returns nested welcome view and slug", () => {
    expect(parseDashboardPath("/dashboard/welcome/messages/my-user")).toEqual({
      view: "messages",
      userSlug: "my-user",
    });
  });

  it("returns direct feature view and slug", () => {
    expect(parseDashboardPath("/dashboard/messages/teammate")).toEqual({
      view: "messages",
      userSlug: "teammate",
    });
  });

  it("handles feature routes under the features prefix", () => {
    expect(
      parseDashboardPath("/dashboard/features/messages/another-user")
    ).toEqual({
      view: "messages",
      userSlug: "another-user",
    });
  });

  it("tolerates missing dashboard segment", () => {
    expect(parseDashboardPath("/other/path")).toEqual({
      view: PROJECTS_OVERVIEW_VIEW,
      userSlug: null,
    });
  });
});