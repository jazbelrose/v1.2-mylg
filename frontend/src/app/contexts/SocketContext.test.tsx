import React from "react";
import { render, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---- Mock contexts BEFORE imports ----
vi.mock("./useAuth", () => ({
  useAuth: vi.fn(),
}));
vi.mock("./useData", () => ({
  useData: vi.fn(),
}));
vi.mock("./useDMConversation", () => ({
  useDMConversation: vi.fn(),
}));

// ---- Types ----
interface MockWebSocket {
  onmessage?: ((event: { data: string }) => void) | null;
  onopen?: (() => void) | null;
  onclose?: (() => void) | null;
  onerror?: ((error: Event) => void) | null;
  readyState: number;
  send(): void;
  close(): void;
}

declare global {
  var mockWebSocket: MockWebSocket;
}

// Create a local mock WebSocket for this test
const localMockWebSocket: MockWebSocket = {
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
};

// Mock the WebSocket connection creation BEFORE imports
vi.doMock("@/shared/utils/secureWebSocketAuth", () => ({
  createSecureWebSocketConnection: vi.fn().mockImplementation(() => {
    console.log('createSecureWebSocketConnection called');
    return Promise.resolve(localMockWebSocket);
  }),
}));

// ---- NOW import the mocked modules ----
import { SocketProvider } from "./SocketContext";
import "@testing-library/jest-dom";
import { useAuth } from "./useAuth";
import { useData } from "./useData";
import { useDMConversation } from "./useDMConversation";

describe("SocketContext collaborator updates", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    console.log('globalThis.mockWebSocket exists:', !!globalThis.mockWebSocket);

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
  });

  it("debounces refreshUsers and fetchUserProfile calls", async () => {
    const refreshUsers = vi.fn();
    const fetchUserProfile = vi.fn();

    (useData as ReturnType<typeof vi.fn>).mockReturnValue({
      setUserData: vi.fn(),
      setInbox: vi.fn(),
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

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      getAuthTokens: vi.fn().mockResolvedValue({ idToken: "token" }),
    });

    render(
      <SocketProvider>
        <div />
      </SocketProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Wait for useEffect to set up refs
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const socket = localMockWebSocket;

    // Simulate WebSocket connection
    act(() => {
      socket.readyState = 1; // OPEN
      if (socket.onopen) socket.onopen();
    });

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
  }, 2000);
});
