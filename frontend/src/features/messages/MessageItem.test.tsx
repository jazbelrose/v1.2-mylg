import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Import component under test
import MessageItem from "./MessageItem";

describe("MessageItem edit", () => {
  it("shows author controls and triggers edit callback", async () => {
    const onEditRequest = vi.fn();

    render(
      <MessageItem
        msg={{
          senderId: "u1",
          messageId: "m1",
          text: "hello",
          timestamp: "t1",
        }}
        prevMsg={null}
        userData={{ userId: "u1" }}
        allUsers={[]}
        openPreviewModal={() => {}}
        folderKey=""
        renderFilePreview={() => null}
        getFileNameFromUrl={() => ""}
        onEditRequest={onEditRequest}
      />
    );

    await userEvent.click(screen.getByLabelText("Edit message"));
    expect(onEditRequest).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "m1" })
    );
  });

  it("hides author actions for other users", () => {
    render(
      <MessageItem
        msg={{
          senderId: "u1",
          messageId: "m2",
          text: "hello",
          timestamp: "t2",
        }}
        prevMsg={null}
        userData={{ userId: "u2" }}
        allUsers={[]}
        openPreviewModal={() => {}}
        folderKey=""
        renderFilePreview={() => null}
        getFileNameFromUrl={() => ""}
      />
    );

    expect(screen.queryByLabelText("Edit message")).toBeNull();
    expect(screen.queryByLabelText("Delete message")).toBeNull();
  });
});
