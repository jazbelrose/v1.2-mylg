import React, { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";

type ButtonPos = { top: number; left: number } | null;

type AnnotationPayload = {
  text: string;
  selectionText: string;
};

type Props = {
  onAddAnnotation?: (payload: AnnotationPayload) => void;
};

type AnnotationClickDetail = {
  selectionText: string;
};

const AnnotationPlugin: React.FC<Props> = ({ onAddAnnotation }) => {
  const [editor] = useLexicalComposerContext();
  const [buttonPos, setButtonPos] = useState<ButtonPos>(null);
  const [selectionText, setSelectionText] = useState<string>("");

  useEffect(() => {
    const updateButton = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.getTextContent().trim()) {
        const domSel = window.getSelection();
        if (domSel && domSel.rangeCount > 0) {
          const rect = domSel.getRangeAt(0).getBoundingClientRect();
          setButtonPos({
            top: window.scrollY + rect.bottom + 5,
            left: window.scrollX + rect.right + 5,
          });
          setSelectionText(selection.getTextContent());
          return;
        }
      }
      setButtonPos(null);
    };

    const handleSelectionChange = () => {
      editor.getEditorState().read(updateButton);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editor]);

  useEffect(() => {
    const handleAnnotationClick = (e: Event) => {
      const ce = e as CustomEvent<AnnotationClickDetail>;
      const selected = ce?.detail?.selectionText;
      if (!selected) return;

      editor.update(() => {
        const rootEl = editor.getRootElement();
        if (!rootEl) return;

        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        let found:
          | {
              node: Text;
              idx: number;
            }
          | null = null;

        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          const idx = node.textContent.indexOf(selected);
          if (idx !== -1) {
            found = { node, idx };
            break;
          }
        }

        if (found) {
          const range = document.createRange();
          range.setStart(found.node, found.idx);
          range.setEnd(found.node, found.idx + selected.length);

          const highlight = document.createElement("span");
          highlight.style.background = "yellow";
          try {
            range.surroundContents(highlight);
          } catch {
            // If DOM structure prevents surrounding, just bail gracefully
            return;
          }

          // Auto-remove highlight after 2s
          window.setTimeout(() => {
            if (highlight.parentNode) {
              // unwrap <span>
              const parent = highlight.parentNode;
              while (highlight.firstChild) {
                parent.insertBefore(highlight.firstChild, highlight);
              }
              parent.removeChild(highlight);
            }
          }, 2000);
        }
      });
    };

    window.addEventListener("annotation-click", handleAnnotationClick as EventListener);
    return () => {
      window.removeEventListener("annotation-click", handleAnnotationClick as EventListener);
    };
  }, [editor]);

  const handleClick = () => {
    const comment = window.prompt("Add comment");
    if (!comment) return;
    onAddAnnotation?.({ text: comment, selectionText });
    setButtonPos(null);
  };

  if (!buttonPos) return null;

  const style: React.CSSProperties = {
    position: "absolute",
    top: buttonPos.top,
    left: buttonPos.left,
    zIndex: 50,
  };

  return (
    <button
      style={style}
      onMouseDown={(e) => e.preventDefault()} // keep selection intact
      onClick={handleClick}
    >
      Add Comment
    </button>
  );
};

export default AnnotationPlugin;
