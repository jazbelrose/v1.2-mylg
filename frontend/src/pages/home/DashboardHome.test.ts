import { describe, expect, it } from "vitest";

import { parseDashboardPath } from "../../dashboard/home/pages/DashboardHome";

describe("parseDashboardPath", () => {
  it("returns the welcome view by default", () => {
    expect(parseDashboardPath("/dashboard")).toEqual({
      view: "welcome",
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
      view: "welcome",
      userSlug: null,
    });
  });
});