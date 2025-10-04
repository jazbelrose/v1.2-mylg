import React from "react";

type RadiusToken = "card" | "line" | "full" | "none" | "inherit";

type SkeletonBaseProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> & {
    radius?: RadiusToken;
  }
>;

const radiusClassMap: Record<Exclude<RadiusToken, "inherit">, string> = {
  card: "rounded-2xl",
  line: "rounded-lg",
  full: "rounded-full",
  none: "rounded-none",
};

const joinClasses = (...classes: Array<string | undefined | false>): string =>
  classes.filter(Boolean).join(" ");

const styleElementId = "skeleton-primitives-styles";

const ensureSkeletonStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(styleElementId)) return;

  const style = document.createElement("style");
  style.id = styleElementId;
  style.textContent = `
:root,
[data-theme='dark'],
body.dark {
  --skeleton-surface: rgba(255, 255, 255, 0.08);
  --skeleton-highlight: rgba(255, 255, 255, 0.16);
}

[data-theme='light'],
body.light {
  --skeleton-surface: rgba(12, 12, 12, 0.08);
  --skeleton-highlight: rgba(12, 12, 12, 0.14);
}

@media (prefers-color-scheme: light) {
  :root {
    --skeleton-surface: rgba(12, 12, 12, 0.08);
    --skeleton-highlight: rgba(12, 12, 12, 0.14);
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;
  document.head.appendChild(style);
};

const useSkeletonTokens = () => {
  React.useEffect(() => {
    ensureSkeletonStyles();
  }, []);
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = React.useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event: MediaQueryList | MediaQueryListEvent) => {
      setReduced(event.matches);
    };

    update(query);

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  return reduced;
};

const SkeletonBoxInner = React.forwardRef<HTMLDivElement, SkeletonBaseProps>(
  ({ className, style, radius = "card", children, ...rest }, ref) => {
    useSkeletonTokens();
    const prefersReducedMotion = usePrefersReducedMotion();

    const radiusClass = radius === "inherit" ? undefined : radiusClassMap[radius] ?? radiusClassMap.card;
    const composedClassName = joinClasses(
      "relative overflow-hidden",
      radiusClass,
      className
    );

    const animatedStyle = React.useMemo<React.CSSProperties>(() => {
      const base: React.CSSProperties = {
        backgroundColor: "var(--skeleton-surface, rgba(255, 255, 255, 0.08))",
      };

      if (!prefersReducedMotion) {
        base.backgroundImage =
          "linear-gradient(110deg, var(--skeleton-surface, rgba(255, 255, 255, 0.08)) 20%, var(--skeleton-highlight, rgba(255, 255, 255, 0.16)) 40%, var(--skeleton-surface, rgba(255, 255, 255, 0.08)) 60%)";
        base.backgroundSize = "200% 100%";
        base.animation = "skeleton-shimmer 1.6s ease-in-out infinite";
      }

      return base;
    }, [prefersReducedMotion]);

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={composedClassName}
        style={{ ...animatedStyle, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
SkeletonBoxInner.displayName = "SkeletonBox";

export const SkeletonBox = React.memo(SkeletonBoxInner);

export const SkeletonText = React.memo<
  React.ComponentProps<typeof SkeletonBox> & { width?: string | number }
>(({ width = "60%", style, className, radius = "line", ...rest }) => (
  <SkeletonBox
    radius={radius}
    className={joinClasses("h-3", className)}
    style={{ width, ...style }}
    {...rest}
  />
));

export const SkeletonAvatar = React.memo<
  React.ComponentProps<typeof SkeletonBox> & { size?: number }
>(({ size = 40, style, radius = "full", ...rest }) => (
  <SkeletonBox
    radius={radius}
    style={{ width: size, height: size, ...style }}
    {...rest}
  />
));

export const SkeletonThumbnail = React.memo<
  React.ComponentProps<typeof SkeletonBox> & { aspect?: string }
>(({ aspect = "16 / 9", style, className, radius = "card", ...rest }) => (
  <SkeletonBox
    radius={radius}
    className={className}
    style={{ width: "100%", aspectRatio: aspect, ...style }}
    {...rest}
  />
));

export default SkeletonBox;
