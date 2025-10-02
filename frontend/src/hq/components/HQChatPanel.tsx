import React from "react";
import ChatPanel from "@/dashboard/project/components/Shared/ChatPanel";
import styles from "./HQChatPanel.module.css";

const HQ_PROJECT_ID = "ed504178-de7a-41b2-899d-dae2232e4139";
const HIDDEN_STORAGE_KEY = "hqChatPanelHidden";
const FLOATING_STORAGE_KEY = "hqChatPanelFloating";

const getStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null) {
      return fallback;
    }

    return storedValue === "true";
  } catch (error) {
    console.warn(`Unable to read localStorage key "${key}":`, error);
    return fallback;
  }
};

const setStoredBoolean = (key: string, value: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch (error) {
    console.warn(`Unable to write localStorage key "${key}":`, error);
  }
};

const HQChatPanel: React.FC = () => {
  const [isHidden, setIsHidden] = React.useState<boolean>(() =>
    getStoredBoolean(HIDDEN_STORAGE_KEY, false)
  );
  const [floatingPreference, setFloatingPreference] = React.useState<boolean>(
    () => getStoredBoolean(FLOATING_STORAGE_KEY, false)
  );

  const handleCloseChat = React.useCallback(() => {
    setIsHidden(true);
  }, []);

  const handleShowChat = React.useCallback(() => {
    setIsHidden(false);
  }, []);

  const handleFloatingChange = React.useCallback((floating: boolean) => {
    setFloatingPreference(floating);
  }, []);

  React.useEffect(() => {
    setStoredBoolean(HIDDEN_STORAGE_KEY, isHidden);
  }, [isHidden]);

  React.useEffect(() => {
    setStoredBoolean(FLOATING_STORAGE_KEY, floatingPreference);
  }, [floatingPreference]);

  if (isHidden) {
    return (
      <button
        type="button"
        className={styles.chatLauncher}
        onClick={handleShowChat}
        aria-label="Open HQ message thread"
      >
        Open HQ messages
      </button>
    );
  }

  return (
    <ChatPanel
      projectId={HQ_PROJECT_ID}
      initialFloating={floatingPreference}
      onFloatingChange={handleFloatingChange}
      initialOpen
      onCloseChat={handleCloseChat}
    />
  );
};

export default HQChatPanel;
