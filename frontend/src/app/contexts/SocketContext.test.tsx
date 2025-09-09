import React from "react";
import { render, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { SocketProvider } from "./SocketContext";
import "@testing-library/jest-dom";

// ---- Mock contexts ----
vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));
vi.mock("./DataProvider", () => ({
  useData: vi.fn(),
}));
vi.mock("./DMConversationContext", () => ({
  useDMConversation: vi.fn(),
}));

import { useAuth } from "./AuthContext";
import { useData } from "./DataProvider";
import { useDMConversation } from "./useDMConversation";

// ---- Types ----
type MockSocketHandler = ((event: { data: string }) => void) | null;

class MockWebSocket {
  public onmessage: MockSocketHandler = null;
  public onopen: (() => void) | null = null;
  public readyState = 1;

  constructor() {
    // expose for test access
    (global as typeof globalThis & { mockSocket?: MockWebSocket }).mockSocket = this;
  }
  send() {}
  close() {}
}

describe("SocketContext collaborator updates", () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();

    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      getAuthTokens: vi.fn().mockResolvedValue({ idToken: "token" }),
    });

    (useDMConversation as ReturnType<typeof vi.fn>).mockReturnValue({
      activeDmConversationId: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
    vi.clearAllMocks();
    global.WebSocket = originalWebSocket;
    delete (global as typeof globalThis & { mockSocket?: MockWebSocket }).mockSocket;
  });

  it("debounces refreshUsers and fetchUserProfile calls", async () => {
    const refreshUsers = vi.fn();
    const fetchUserProfile = vi.fn();

    (useData as ReturnType<typeof vi.fn>).mockReturnValue({
      setUserData: vi.fn(),
      setDmThreads: vi.fn(),
      userId: "u1",
      setProjects: vi.fn(),
      setUserProjects: vi.fn(),
      setActiveProject: vi.fn(),
      updateProjectFields: vi.fn(),
      setProjectMessages: vi.fn(),
      deletedMessageIds: new Set<string>(),
      markMessageDeleted: vi.fn(),
      activeProject: null,
      fetchProjects: vi.fn(),
      fetchUserProfile,
      refreshUsers,
    });

    render(
      <SocketProvider>
        <div />
      </SocketProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const socket: MockWebSocket = (global as typeof globalThis & { mockSocket?: MockWebSocket }).mockSocket!;

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ type: "collaborators-updated" }) });
      socket.onmessage?.({ data: JSON.stringify({ type: "collaborators-updated" }) });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(refreshUsers).toHaveBeenCalledTimes(1);
    expect(fetchUserProfile).toHaveBeenCalledTimes(1);

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ type: "collaborators-updated" }) });
      vi.advanceTimersByTime(1000);
    });

    expect(refreshUsers).toHaveBeenCalledTimes(2);
    expect(fetchUserProfile).toHaveBeenCalledTimes(2);
  });
});
