import React, {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(" ");

export type ProjectThumbVariant = "default" | "wip" | "prototype" | "archived";

export interface ProjectThumbProps
  extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  label?: string;
  variant?: ProjectThumbVariant;
  grain?: boolean;
  vignette?: boolean;
  fallbackInitial?: string;
  imageProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}

interface PlaceholderIds {
  maskId: string;
  noiseId: string;
  gradientId: string;
  accentId: string;
}

const sanitizeForId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, "");

const usePlaceholderIds = (): PlaceholderIds => {
  const reactId = useId();
  return useMemo(() => {
    const sanitized = sanitizeForId(reactId) || "thumb";
    const base = `thumb-${sanitized}`;
    return {
      maskId: `${base}-mask`,
      noiseId: `${base}-noise`,
      gradientId: `${base}-gradient`,
      accentId: `${base}-accent`,
    };
  }, [reactId]);
};

const TornPaperPlaceholder: React.FC<{
  initial?: string;
  ids: PlaceholderIds;
}> = ({ initial, ids }) => (
  <svg
    className="project-thumb__placeholder"
    viewBox="0 0 400 300"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id={ids.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1c1c1f" />
        <stop offset="45%" stopColor="#121214" />
        <stop offset="100%" stopColor="#080808" />
      </linearGradient>
      <radialGradient id={ids.accentId} cx="78%" cy="18%" r="78%">
        <stop offset="0%" stopColor="rgba(250, 51, 86, 0.38)" />
        <stop offset="55%" stopColor="rgba(250, 51, 86, 0.14)" />
        <stop offset="100%" stopColor="rgba(250, 51, 86, 0)" />
      </radialGradient>
      <filter id={ids.noiseId} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="3"
          seed="42"
        />
        <feComponentTransfer>
          <feFuncA type="linear" slope="1.4" />
        </feComponentTransfer>
      </filter>
      <mask id={ids.maskId} maskUnits="userSpaceOnUse">
        <path
          fill="#fff"
          d="M0 38 Q 24 6 68 18 T 136 16 T 208 12 T 286 24 T 360 14 T 400 26 L400 268 Q 336 310 292 276 T 220 292 T 148 268 T 64 296 T 0 276 Z"
        />
      </mask>
    </defs>
    <g mask={`url(#${ids.maskId})`}>
      <rect width="400" height="300" fill={`url(#${ids.gradientId})`} />
      <rect
        width="400"
        height="300"
        fill={`url(#${ids.accentId})`}
        style={{ mixBlendMode: "screen", opacity: 0.32 }}
      />
      <rect
        width="400"
        height="300"
        filter={`url(#${ids.noiseId})`}
        fill="rgba(255, 255, 255, 0.4)"
        style={{
          mixBlendMode: "soft-light",
          opacity: "var(--thumb-grain-opacity, 0.024)",
        }}
      />
      <path
        d="M-10 92 Q 120 70 214 94 T 410 66"
        fill="none"
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M-36 214 Q 124 252 214 228 T 436 262"
        fill="none"
        stroke="rgba(0, 0, 0, 0.35)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M28 126 C 46 118 66 120 84 134"
        fill="none"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 10"
      />
      <circle cx="56" cy="198" r="26" fill="rgba(255, 255, 255, 0.05)" />
      <circle cx="334" cy="118" r="34" fill="rgba(250, 51, 86, 0.1)" />
    </g>
    {initial && (
      <text
        x="200"
        y="178"
        textAnchor="middle"
        dominantBaseline="middle"
        className="project-thumb__placeholder-initial"
      >
        {initial}
      </text>
    )}
  </svg>
);

const ProjectThumb = forwardRef<HTMLDivElement, ProjectThumbProps>((props, ref) => {
  const {
    src,
    alt = "Project thumbnail",
    label,
    variant = "default",
    grain = true,
    vignette = true,
    fallbackInitial,
    className,
    imageProps,
    ...rest
  } = props;

  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    setImageError(false);
  }, [src]);

  const resolvedSrc = src && !imageError ? src : undefined;
  const trimmedLabel = label?.trim();
  const showLabel = Boolean(trimmedLabel);
  const ids = usePlaceholderIds();
  const placeholderInitial = useMemo(() => {
    const first = fallbackInitial?.trim();
    return first && first.length > 0 ? first.charAt(0).toUpperCase() : undefined;
  }, [fallbackInitial]);

  const {
    className: imgClassName,
    onError: imgOnError,
    loading: loadingProp,
    decoding: decodingProp,
    ...imgRest
  } = imageProps ?? {};

  const { "aria-label": ariaLabelProp, role: roleProp, ...containerRest } = rest;
  const resolvedRole = roleProp ?? (resolvedSrc ? undefined : "img");
  const resolvedAriaLabel = ariaLabelProp ?? (resolvedSrc ? undefined : alt);

  return (
    <div
      ref={ref}
      className={cx("project-thumb", className)}
      data-variant={variant}
      data-empty={resolvedSrc ? undefined : "true"}
      data-grain={grain ? "true" : undefined}
      data-vignette={vignette ? "true" : undefined}
      role={resolvedRole}
      aria-label={resolvedAriaLabel}
      {...containerRest}
    >
      {resolvedSrc ? (
        <img
          {...imgRest}
          className={cx("project-thumb__image", imgClassName)}
          src={resolvedSrc}
          alt={alt}
          loading={loadingProp ?? "lazy"}
          decoding={decodingProp ?? "async"}
          onError={(event) => {
            setImageError(true);
            imgOnError?.(event);
          }}
        />
      ) : (
        <TornPaperPlaceholder initial={placeholderInitial} ids={ids} />
      )}
      <span className="project-thumb__smudges" aria-hidden="true" />
      {grain && <span className="project-thumb__grain" aria-hidden="true" />}
      {vignette && <span className="project-thumb__vignette" aria-hidden="true" />}
      {showLabel && (
        <span className="project-thumb__label">
          <span className="project-thumb__label-text">{trimmedLabel}</span>
        </span>
      )}
    </div>
  );
});

ProjectThumb.displayName = "ProjectThumb";

export default ProjectThumb;
