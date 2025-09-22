import React from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils";
import "./popover.css";

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  contentRef: React.RefObject<HTMLDivElement>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

const usePopoverContext = () => {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error("Popover components must be used within <Popover>");
  }
  return context;
};

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
}) => {
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  React.useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, setOpen]);

  const contextValue = React.useMemo(
    () => ({ open, setOpen, triggerRef, contentRef }),
    [open, setOpen]
  );

  return (
    <PopoverContext.Provider value={contextValue}>
      <div className="ui-popover">{children}</div>
    </PopoverContext.Provider>
  );
};

interface PopoverTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

interface PopoverTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export const PopoverTrigger = React.forwardRef<HTMLElement, PopoverTriggerProps>(
  ({ children, asChild = false }, forwardedRef) => {
    const { open, setOpen, triggerRef } = usePopoverContext();

    const child = asChild
      ? (children as React.ReactElement)
      // @ts-expect-error children may not have type prop
      : React.cloneElement(children as React.ReactElement, { type: "button" });

    const refCallback = (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLElement | null>).current =
          node;
      }
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      // @ts-expect-error child.props may not have onClick
      child.props.onClick?.(event);
      if (!event.defaultPrevented) {
        setOpen(!open);
      }
    };

    return React.cloneElement(child, { // @ts-expect-error cloneElement with ref
      ref: refCallback,
      "aria-expanded": open,
      onClick: handleClick,
    });
  }
);

PopoverTrigger.displayName = "PopoverTrigger";

interface PopoverContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, style, align = "end", children, ...props }, forwardedRef) => {
    const { open, contentRef, triggerRef, setOpen } = usePopoverContext();
    const [position, setPosition] = React.useState<
      | null
      | {
          top: number;
          left: number;
          placement: "top" | "bottom";
        }
    >(null);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
      if (typeof window === "undefined") return undefined;

      const mq = window.matchMedia("(max-width: 640px)");
      const handleChange = () => setIsMobile(mq.matches);
      handleChange();
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    }, []);

    const refCallback = (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
    };

    React.useLayoutEffect(() => {
      if (typeof window === "undefined") return;

      if (!open) {
        setPosition(null);
        return;
      }

      const spacing = 8;
      const viewportPadding = 12;

      const updatePosition = () => {
        if (!triggerRef.current || !contentRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();

        // Temporarily reset inline styles to measure natural size
        contentRef.current.style.left = "0px";
        contentRef.current.style.top = "0px";
        contentRef.current.style.transform = "none";

        const contentRect = contentRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left: number;
        switch (align) {
          case "start":
            left = triggerRect.left;
            break;
          case "center":
            left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
            break;
          case "end":
          default:
            left = triggerRect.right - contentRect.width;
        }

        const maxLeft = viewportWidth - contentRect.width - viewportPadding;
        if (contentRect.width >= viewportWidth - viewportPadding * 2) {
          left = viewportPadding;
        } else {
          left = Math.min(Math.max(left, viewportPadding), maxLeft);
        }

        let top = triggerRect.bottom + spacing;
        let placement: "top" | "bottom" = "bottom";

        if (top + contentRect.height > viewportHeight - viewportPadding) {
          const aboveTop = triggerRect.top - spacing - contentRect.height;

          if (aboveTop >= viewportPadding) {
            top = aboveTop;
            placement = "top";
          } else {
            // Clamp within viewport when neither direction fits perfectly
            const maxTop = viewportHeight - viewportPadding - contentRect.height;
            top = Math.max(viewportPadding, Math.min(top, maxTop));
          }
        }

        setPosition({ top, left, placement });
      };

      updatePosition();

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [align, open, triggerRef, contentRef]);

    if (!open) return null;

    const shouldShowMobileClose = isMobile && align === "center";

    const content = (
      <div
        ref={refCallback}
        className={cn("ui-popover-content", className)}
        style={{
          top: position?.top,
          left: position?.left,
          visibility: position ? "visible" : "hidden",
          ...style,
        }}
        role="menu"
        data-placement={position?.placement}
        {...props}
      >
        {shouldShowMobileClose ? (
          <button
            type="button"
            className="ui-popover-close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        {children}
      </div>
    );

    return createPortal(content, document.body);
  }
);

PopoverContent.displayName = "PopoverContent";

