import type { Project, Thread, UserLite } from "@/app/contexts/DataProvider";
import type { ProjectMessagesMap } from "@/app/contexts/MessagesContextValue";

type PreviewBudgetHeader = {
  budgetItemId: `HEADER-${string}`;
  projectId: string;
  budgetId: string;
  revision: number;
  clientRevisionId?: number | null;
  [key: string]: unknown;
};

type PreviewBudgetLine = {
  budgetItemId: `LINE-${string}`;
  projectId: string;
  budgetId: string;
  revision: number;
  [key: string]: unknown;
};

const PREVIEW_STORAGE_KEY = "dashboardPreviewMode";
const PREVIEW_EVENT = "dashboard-preview-mode-change";

export interface PreviewActivityItem {
  id: string;
  type: "project" | "message";
  projectId: string;
  projectTitle: string;
  text: string;
  timestamp: string;
}

export interface DevPreviewData {
  user: UserLite;
  allUsers: UserLite[];
  projects: Project[];
  inbox: Thread[];
  projectMessages: ProjectMessagesMap;
  recentActivity: PreviewActivityItem[];
  budgets: Record<
    string,
    {
      headers: PreviewBudgetHeader[];
      items: PreviewBudgetLine[];
    }
  >;
}

const PREVIEW_USER_ID = "preview-user";

const PREVIEW_BUDGETS: DevPreviewData["budgets"] = {
  "preview-riverside": {
    headers: [
      {
        budgetItemId: "HEADER-riverside-2024-rev2",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 2,
        clientRevisionId: 2,
        title: "Phase 2 Lighting + Seating",
        projectTitle: "Riverside Park Redesign",
        createdAt: "2024-05-20T17:30:00.000Z",
        startDate: "2024-06-10",
        endDate: "2024-09-30",
        headerBallPark: 3960,
        headerBudgetedTotalCost: 4125,
        headerActualTotalCost: 3580,
        headerFinalTotalCost: 3960,
        headerEffectiveMarkup: 0.22,
        clients: ["City of Westbridge Parks Dept."],
        invoiceBrandName: "MYLG Fabrication",
        invoiceBrandAddress: "401 Market Street, Westbridge, OR 97204",
        invoiceBrandPhone: "(555) 210-7788",
      },
      {
        budgetItemId: "HEADER-riverside-2024-rev1",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 1,
        clientRevisionId: 2,
        title: "Initial scope draft",
        projectTitle: "Riverside Park Redesign",
        createdAt: "2024-04-28T15:10:00.000Z",
        startDate: "2024-05-20",
        endDate: "2024-08-15",
        headerBallPark: 3820,
        headerBudgetedTotalCost: 3900,
        headerActualTotalCost: 0,
        headerFinalTotalCost: 0,
        headerEffectiveMarkup: 0.18,
        clients: ["City of Westbridge Parks Dept."],
      },
    ],
    items: [
      {
        budgetItemId: "LINE-riverside-lighting",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 2,
        elementId: "EL-201",
        invoiceGroup: "Lighting",
        areaGroup: "Promenade",
        itemName: "Interactive promenade lighting",
        itemDescription: "RGBW fixtures with DMX playback for the east promenade railing",
        quantity: 12,
        unit: "ea",
        unitCost: 120,
        itemBudgetedCost: 1500,
        itemActualCost: 1425,
        itemFinalCost: 1460,
        itemMarkUp: 0.22,
        paymentStatus: "Partial",
        status: "Approved",
        client: "City of Westbridge Parks Dept.",
        startDate: "2024-07-01",
        endDate: "2024-07-20",
        dates: "Jul 1 – Jul 20",
        owner: "Preview User",
      },
      {
        budgetItemId: "LINE-riverside-seating",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 2,
        elementId: "EL-218",
        invoiceGroup: "Fabrication",
        areaGroup: "Terraces",
        itemName: "Modular seating platforms",
        itemDescription: "Powder-coated aluminum platforms with integrated planters",
        quantity: 8,
        unit: "kit",
        unitCost: 160,
        itemBudgetedCost: 1200,
        itemActualCost: 1180,
        itemFinalCost: 1280,
        itemMarkUp: 0.2,
        paymentStatus: "Pending",
        status: "In Progress",
        client: "City of Westbridge Parks Dept.",
        startDate: "2024-07-08",
        endDate: "2024-08-05",
        dates: "Jul 8 – Aug 5",
        owner: "Avery Harper",
      },
      {
        budgetItemId: "LINE-riverside-install",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 2,
        elementId: "EL-233",
        invoiceGroup: "Installation",
        areaGroup: "Promenade",
        itemName: "Night install labor",
        itemDescription: "Nightly crew for lighting + seating placement",
        quantity: 6,
        unit: "shift",
        unitCost: 110,
        itemBudgetedCost: 780,
        itemActualCost: 760,
        itemFinalCost: 780,
        itemMarkUp: 0.12,
        paymentStatus: "Scheduled",
        status: "Scheduled",
        client: "City of Westbridge Parks Dept.",
        startDate: "2024-08-01",
        endDate: "2024-08-14",
        dates: "Aug 1 – Aug 14",
        owner: "Max Ramirez",
      },
      {
        budgetItemId: "LINE-riverside-power",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 2,
        elementId: "EL-245",
        invoiceGroup: "Electrical",
        areaGroup: "Promenade",
        itemName: "Power redistribution",
        itemDescription: "Rework of site power drops to support lighting",
        quantity: 1,
        unit: "lot",
        unitCost: 320,
        itemBudgetedCost: 320,
        itemActualCost: 300,
        itemFinalCost: 340,
        itemMarkUp: 0.15,
        paymentStatus: "Approved",
        status: "Approved",
        client: "City of Westbridge Parks Dept.",
        startDate: "2024-07-18",
        endDate: "2024-07-25",
        dates: "Jul 18 – Jul 25",
        owner: "Preview User",
      },
      {
        budgetItemId: "LINE-riverside-permits",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 2,
        elementId: "EL-250",
        invoiceGroup: "Fees",
        areaGroup: "Permitting",
        itemName: "Parks permit fees",
        itemDescription: "City permit and inspection coordination",
        quantity: 1,
        unit: "allow",
        unitCost: 100,
        itemBudgetedCost: 100,
        itemActualCost: 90,
        itemFinalCost: 100,
        itemMarkUp: 0.1,
        paymentStatus: "Paid",
        status: "Closed",
        client: "City of Westbridge Parks Dept.",
        startDate: "2024-06-28",
        endDate: "2024-07-02",
        dates: "Jun 28 – Jul 2",
        owner: "Devon Wells",
      },
      {
        budgetItemId: "LINE-riverside-lighting-r1",
        projectId: "preview-riverside",
        budgetId: "BUDGET-riverside-2024",
        revision: 1,
        elementId: "EL-201",
        invoiceGroup: "Lighting",
        areaGroup: "Promenade",
        itemName: "Interactive promenade lighting",
        itemDescription: "Earlier draft scope for lighting",
        quantity: 10,
        unit: "ea",
        unitCost: 120,
        itemBudgetedCost: 1200,
        itemActualCost: 0,
        itemFinalCost: 0,
        itemMarkUp: 0.15,
        paymentStatus: "Pending",
        status: "Draft",
        client: "City of Westbridge Parks Dept.",
      },
    ],
  },
  "preview-harbor": {
    headers: [
      {
        budgetItemId: "HEADER-harbor-2024-rev1",
        projectId: "preview-harbor",
        budgetId: "BUDGET-harbor-pop-up",
        revision: 1,
        clientRevisionId: 1,
        title: "Pop-up pavilion concept",
        projectTitle: "Harbor Pavilion Pop-up",
        createdAt: "2024-05-18T19:05:00.000Z",
        startDate: "2024-07-05",
        endDate: "2024-09-15",
        headerBallPark: 2860,
        headerBudgetedTotalCost: 2985,
        headerActualTotalCost: 1895,
        headerFinalTotalCost: 2620,
        headerEffectiveMarkup: 0.18,
        clients: ["Port Authority Events"],
        invoiceBrandName: "MYLG Studio",
        invoiceBrandAddress: "24 Harbor Way, Suite 200, Westbridge, OR 97204",
        invoiceBrandPhone: "(555) 482-1100",
      },
    ],
    items: [
      {
        budgetItemId: "LINE-harbor-structure",
        projectId: "preview-harbor",
        budgetId: "BUDGET-harbor-pop-up",
        revision: 1,
        elementId: "HP-101",
        invoiceGroup: "Structure",
        areaGroup: "Deck",
        itemName: "Modular pavilion framing",
        itemDescription: "Aluminum tube framing kit with powder coat",
        quantity: 6,
        unit: "kit",
        unitCost: 210,
        itemBudgetedCost: 1260,
        itemActualCost: 1180,
        itemFinalCost: 1320,
        itemMarkUp: 0.18,
        paymentStatus: "Partial",
        status: "Approved",
        client: "Port Authority Events",
        startDate: "2024-07-12",
        endDate: "2024-08-02",
        dates: "Jul 12 – Aug 2",
        owner: "Preview User",
      },
      {
        budgetItemId: "LINE-harbor-lighting",
        projectId: "preview-harbor",
        budgetId: "BUDGET-harbor-pop-up",
        revision: 1,
        elementId: "HP-118",
        invoiceGroup: "Lighting",
        areaGroup: "Canopy",
        itemName: "Interactive canopy lighting",
        itemDescription: "Wireless DMX fixtures with show controller",
        quantity: 14,
        unit: "ea",
        unitCost: 85,
        itemBudgetedCost: 980,
        itemActualCost: 920,
        itemFinalCost: 980,
        itemMarkUp: 0.16,
        paymentStatus: "Pending",
        status: "In Review",
        client: "Port Authority Events",
        startDate: "2024-07-18",
        endDate: "2024-08-18",
        dates: "Jul 18 – Aug 18",
        owner: "Avery Harper",
      },
      {
        budgetItemId: "LINE-harbor-activation",
        projectId: "preview-harbor",
        budgetId: "BUDGET-harbor-pop-up",
        revision: 1,
        elementId: "HP-140",
        invoiceGroup: "Programming",
        areaGroup: "Experience",
        itemName: "Lighting activation & programming",
        itemDescription: "Interactive lighting content + onsite programming",
        quantity: 5,
        unit: "day",
        unitCost: 64,
        itemBudgetedCost: 320,
        itemActualCost: 295,
        itemFinalCost: 320,
        itemMarkUp: 0.14,
        paymentStatus: "Scheduled",
        status: "Scheduled",
        client: "Port Authority Events",
        startDate: "2024-08-22",
        endDate: "2024-09-05",
        dates: "Aug 22 – Sep 5",
        owner: "Max Ramirez",
      },
    ],
  },
};

const PREVIEW_BUDGET_LOOKUP = new Map<
  string,
  {
    projectId: string;
    data: { headers: PreviewBudgetHeader[]; items: PreviewBudgetLine[] };
  }
>();

Object.entries(PREVIEW_BUDGETS).forEach(([projectId, data]) => {
  data.headers.forEach((header) => {
    PREVIEW_BUDGET_LOOKUP.set(header.budgetId, { projectId, data });
  });
});

const DEV_PREVIEW_DATA: DevPreviewData = {
  user: {
    userId: PREVIEW_USER_ID,
    firstName: "Preview",
    lastName: "User",
    email: "preview.user@example.com",
    role: "admin",
    occupation: "Design Lead",
    phoneNumber: "+1 (555) 010-0101",
    company: "MYLG Labs",
    collaborators: ["avery-harper", "max-ramirez"],
    projects: ["preview-riverside", "preview-harbor"],
    thumbnailUrl: "https://avatars.githubusercontent.com/u/000?v=4",
    messages: [],
  },
  allUsers: [
    {
      userId: PREVIEW_USER_ID,
      firstName: "Preview",
      lastName: "User",
      email: "preview.user@example.com",
      role: "admin",
      occupation: "Design Lead",
      phoneNumber: "+1 (555) 010-0101",
    },
    {
      userId: "avery-harper",
      firstName: "Avery",
      lastName: "Harper",
      email: "avery@mylg.dev",
      role: "designer",
      occupation: "UX Designer",
      phoneNumber: "+1 (555) 010-0102",
    },
    {
      userId: "max-ramirez",
      firstName: "Max",
      lastName: "Ramirez",
      email: "max@mylg.dev",
      role: "builder",
      occupation: "Site Lead",
      phoneNumber: "+1 (555) 010-0103",
    },
    {
      userId: "devon-wells",
      firstName: "Devon",
      lastName: "Wells",
      email: "devon@mylg.dev",
      role: "vendor",
      occupation: "Lighting Vendor",
      phoneNumber: "+1 (555) 010-0104",
    },
  ],
  projects: [
    {
      projectId: "preview-riverside",
      title: "Riverside Park Redesign",
      status: "In Progress",
      description:
        "A public space refresh with new wayfinding, lighting, and modular seating zones.",
      color: "#0F62FE",
      clientName: "City of Westbridge",
      clientEmail: "parks@westbridge.gov",
      previewUrl: "project-thumbnails/riverside/main.jpg",
      quickLinks: [
        { id: "brief", title: "Project Brief", url: "https://example.com/brief" },
        { id: "site-plan", title: "Site Plan", url: "https://example.com/site-plan" },
      ],
      timelineEvents: [
        {
          id: "event-kickoff",
          title: "Kickoff workshop",
          date: "2024-04-04",
          description: "Stakeholder alignment session with Parks & Rec.",
        },
        {
          id: "event-fabrication",
          title: "Fabrication lock",
          date: "2024-06-12",
          description: "Sign-off on lighting fixture order and bench fabrication.",
        },
        {
          id: "event-install",
          title: "Install week",
          date: "2024-07-22",
          description: "Nightly install for new lighting grid and furniture.",
        },
      ],
      team: [
        { userId: PREVIEW_USER_ID, role: "admin" },
        { userId: "avery-harper", role: "designer" },
        { userId: "max-ramirez", role: "builder" },
      ],
    },
    {
      projectId: "preview-harbor",
      title: "Harbor Pavilion Pop-up",
      status: "Planning",
      description:
        "Seasonal retail pavilion with interactive lighting and vendor stalls.",
      color: "#FF7A45",
      clientName: "Port Authority",
      clientEmail: "events@harborport.io",
      previewUrl: "project-thumbnails/harbor/main.jpg",
      quickLinks: [
        { id: "budget", title: "Budget Snapshot", url: "https://example.com/budget" },
        { id: "deck", title: "Concept Deck", url: "https://example.com/deck" },
      ],
      timelineEvents: [
        {
          id: "event-scoping",
          title: "Scoping walk",
          date: "2024-05-10",
          description: "Harbor site walk + vendor orientation.",
        },
        {
          id: "event-permits",
          title: "Permits submitted",
          date: "2024-05-24",
          description: "Permitting packet delivered to Port Authority.",
        },
      ],
      team: [
        { userId: PREVIEW_USER_ID, role: "admin" },
        { userId: "devon-wells", role: "vendor" },
      ],
    },
  ],
  inbox: [
    {
      conversationId: "thread-avery",
      otherUserId: "avery-harper",
      lastMsgTs: "2024-05-21T15:30:00.000Z",
      snippet: "Moodboard feedback looks great — I dropped comments.",
      read: false,
    },
    {
      conversationId: "thread-max",
      otherUserId: "max-ramirez",
      lastMsgTs: "2024-05-20T20:45:00.000Z",
      snippet: "Confirmed overnight install crew for July 22 start.",
      read: true,
    },
  ],
  projectMessages: {
    "preview-riverside": [
      {
        messageId: "riverside-1",
        body: "Uploaded revised site plan with adjusted lighting grid.",
        timestamp: "2024-05-21T14:10:00.000Z",
        reactions: { "👍": [PREVIEW_USER_ID, "avery-harper"] },
      },
      {
        messageId: "riverside-2",
        body: "Reminder: fabrication lock is June 12 — review fixtures.",
        timestamp: "2024-05-20T09:00:00.000Z",
      },
    ],
    "preview-harbor": [
      {
        messageId: "harbor-1",
        body: "Permitting packet submitted to Port Authority today.",
        timestamp: "2024-05-19T18:25:00.000Z",
      },
    ],
  },
  recentActivity: [
    {
      id: "activity-1",
      type: "project",
      projectId: "preview-riverside",
      projectTitle: "Riverside Park Redesign",
      text: "Avery Harper uploaded a new lighting concept.",
      timestamp: "2024-05-21T16:10:00.000Z",
    },
    {
      id: "activity-2",
      type: "message",
      projectId: "preview-harbor",
      projectTitle: "Harbor Pavilion Pop-up",
      text: "Max Ramirez added install notes in Messages.",
      timestamp: "2024-05-20T22:45:00.000Z",
    },
  ],
  budgets: PREVIEW_BUDGETS,
};

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createJsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const resolveRequestUrl = (input: RequestInfo | URL): string | null => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }
  if (typeof input === "object" && input !== null && "url" in input) {
    const candidate = (input as { url?: unknown }).url;
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return null;
};

const handlePreviewBudgetRequest = (rawUrl: string): Response | null => {
  let parsed: URL;
  try {
    parsed = new URL(
      rawUrl,
      typeof window !== "undefined" ? window.location.origin : "http://localhost"
    );
  } catch {
    return null;
  }

  const headerMatch = parsed.pathname.match(/\/projects\/([^/]+)\/budget$/);
  if (headerMatch && parsed.searchParams.get("headers") === "true") {
    const projectId = decodeURIComponent(headerMatch[1]);
    const dataset = PREVIEW_BUDGETS[projectId];
    if (dataset) {
      const headers = dataset.headers.map((header) => deepClone(header));
      return createJsonResponse({ Items: headers });
    }
  }

  const itemsMatch = parsed.pathname.match(/\/budgets\/byBudgetId\/([^/]+)$/);
  if (itemsMatch) {
    const budgetId = decodeURIComponent(itemsMatch[1]);
    const entry = PREVIEW_BUDGET_LOOKUP.get(budgetId);
    if (entry) {
      const revisionParam = parsed.searchParams.get("revision");
      const revision = revisionParam != null ? Number(revisionParam) : null;
      const items = entry.data.items.filter((item) => {
        if (item.budgetId !== budgetId) return false;
        if (revision == null) return true;
        const itemRevision = Number((item as { revision?: number }).revision ?? 0);
        return Number.isNaN(itemRevision) ? false : itemRevision === revision;
      });
      return createJsonResponse({ Items: items.map((item) => deepClone(item)) });
    }
  }

  return null;
};

let restorePreviewFetch: (() => void) | null = null;

const installPreviewFetchMock = (): void => {
  if (
    restorePreviewFetch ||
    typeof window === "undefined" ||
    typeof window.fetch !== "function"
  ) {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveRequestUrl(input);
    if (url && isPreviewModeEnabled()) {
      const response = handlePreviewBudgetRequest(url);
      if (response) {
        return response;
      }
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;

  restorePreviewFetch = () => {
    window.fetch = originalFetch;
    restorePreviewFetch = null;
  };
};

const removePreviewFetchMock = (): void => {
  if (restorePreviewFetch) {
    restorePreviewFetch();
  }
};

const noop = () => undefined;

export const isPreviewModeSupported = (): boolean => Boolean(import.meta.env.DEV);

export const isPreviewModeEnabled = (): boolean => {
  if (!isPreviewModeSupported() || typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(PREVIEW_STORAGE_KEY) === "on" ||
      window.localStorage.getItem(PREVIEW_STORAGE_KEY) === "on"
    );
  } catch {
    return false;
  }
};

export const setPreviewModeEnabled = (enabled: boolean): void => {
  if (!isPreviewModeSupported() || typeof window === "undefined") return;
  try {
    if (enabled) {
      window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, "on");
      installPreviewFetchMock();
    } else {
      window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
      removePreviewFetchMock();
    }
  } catch {
    /* ignore storage errors in dev */
  }
  try {
    window.dispatchEvent(new CustomEvent(PREVIEW_EVENT));
  } catch {
    noop();
  }
};

export const syncPreviewModeFromSearch = (search: string): boolean => {
  if (!isPreviewModeSupported() || typeof window === "undefined") return false;
  let handled = false;
  try {
    const params = new URLSearchParams(search);
    const value = params.get("preview");
    if (value !== null) {
      const enable = !["0", "false", "off"].includes(value.toLowerCase());
      setPreviewModeEnabled(enable);
      handled = true;
    }
  } catch {
    noop();
  }
  return handled;
};

export const subscribeToPreviewMode = (callback: () => void): (() => void) => {
  if (!isPreviewModeSupported() || typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => callback();
  window.addEventListener(PREVIEW_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(PREVIEW_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};

if (isPreviewModeSupported() && typeof window !== "undefined" && isPreviewModeEnabled()) {
  installPreviewFetchMock();
}

export const getPreviewBudgetData = (
  projectId: string
): { headers: PreviewBudgetHeader[]; items: PreviewBudgetLine[] } | null => {
  const dataset = PREVIEW_BUDGETS[projectId];
  if (!dataset) return null;
  return {
    headers: dataset.headers.map((header) => deepClone(header)),
    items: dataset.items.map((item) => deepClone(item)),
  };
};

export const getPreviewBudgetHeaders = (projectId: string): PreviewBudgetHeader[] => {
  const dataset = PREVIEW_BUDGETS[projectId];
  return dataset ? dataset.headers.map((header) => deepClone(header)) : [];
};

export const getPreviewBudgetItems = (
  budgetId: string,
  revision?: number
): PreviewBudgetLine[] => {
  const entry = PREVIEW_BUDGET_LOOKUP.get(budgetId);
  if (!entry) return [];
  return entry.data.items
    .filter((item) => {
      if (item.budgetId !== budgetId) return false;
      if (revision == null) return true;
      const itemRevision = Number((item as { revision?: number }).revision ?? 0);
      return Number.isNaN(itemRevision) ? false : itemRevision === revision;
    })
    .map((item) => deepClone(item));
};

export const getDevPreviewData = (): DevPreviewData => DEV_PREVIEW_DATA;

export type { PreviewBudgetHeader, PreviewBudgetLine };

