import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect width='20' height='20' rx='4' fill='%234ea1f3'/%3E%3Cpath d='M4.75 11.25l4.5-4.5m1.5 0l4.5 4.5M6 14h8' fill='none' stroke='%23fff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

const CACHE_NAMESPACE = "mylg:favicon";
const memoryCache = new Map<string, string>();
const pendingFetches = new Map<string, Promise<string>>();

const getStorageKey = (domain: string) => `${CACHE_NAMESPACE}:${domain}`;

const isBrowser = typeof window !== "undefined";

const readFromStorage = (domain: string): string | null => {
  if (!isBrowser) return null;
  try {
    const stored = window.localStorage.getItem(getStorageKey(domain));
    return stored;
  } catch {
    return null;
  }
};

const writeToStorage = (domain: string, dataUrl: string) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(getStorageKey(domain), dataUrl);
  } catch {
    // ignore quota/security errors
  }
};

const blobToDataUrl = async (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });

const fetchFavicon = async (domain: string): Promise<string> => {
  if (!isBrowser || !domain || typeof fetch !== "function") return DEFAULT_ICON;

  const inMemory = memoryCache.get(domain);
  if (inMemory) return inMemory;

  const stored = readFromStorage(domain);
  if (stored) {
    memoryCache.set(domain, stored);
    return stored;
  }

  if (pendingFetches.has(domain)) {
    return pendingFetches.get(domain)!;
  }

  const fetchPromise = (async () => {
    const endpoints = [
      `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          mode: "cors",
          credentials: "omit",
          cache: "force-cache",
        });
        if (!response.ok) continue;
        const blob = await response.blob();
        if (blob.size === 0) continue;
        const dataUrl = await blobToDataUrl(blob);
        memoryCache.set(domain, dataUrl);
        writeToStorage(domain, dataUrl);
        return dataUrl;
      } catch {
        // try next endpoint
      }
    }

    memoryCache.set(domain, DEFAULT_ICON);
    writeToStorage(domain, DEFAULT_ICON);
    return DEFAULT_ICON;
  })().finally(() => {
    pendingFetches.delete(domain);
  });

  pendingFetches.set(domain, fetchPromise);

  return fetchPromise;
};

interface CachedFaviconProps {
  domain: string;
}

const CachedFaviconComponent: React.FC<CachedFaviconProps> = ({ domain }) => {
  const [src, setSrc] = useState(DEFAULT_ICON);

  const normalizedDomain = useMemo(() => domain.trim().toLowerCase(), [domain]);

  useEffect(() => {
    let isMounted = true;

    if (!normalizedDomain) {
      setSrc(DEFAULT_ICON);
      return () => {
        isMounted = false;
      };
    }

    setSrc(DEFAULT_ICON);

    fetchFavicon(normalizedDomain)
      .then((dataUrl) => {
        if (isMounted) {
          setSrc(dataUrl || DEFAULT_ICON);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSrc(DEFAULT_ICON);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedDomain]);

  return (
    <span
      aria-hidden="true"
      style={{
        width: 20,
        height: 20,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          aspectRatio: "1 / 1",
          objectFit: "contain",
          display: "block",
        }}
        referrerPolicy="no-referrer"
      />
    </span>
  );
};

const CachedFavicon = React.memo(
  CachedFaviconComponent,
  (prevProps, nextProps) => prevProps.domain === nextProps.domain
);

CachedFavicon.displayName = "CachedFavicon";

export default CachedFavicon;

