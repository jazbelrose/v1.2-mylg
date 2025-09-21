import type { TimelineEvent as ApiTimelineEvent } from "@/shared/utils/api";

export type TimelineEvent = {
  id: string;
  eventId?: string;
  date: string; // YYYY-MM-DD
  description?: string;
  hours?: number | string;
  budgetItemId?: string | null;
  createdAt?: string;
  createdBy?: string;
  payload?: Record<string, unknown>;
};

export type Project = {
  projectId: string;
  title?: string;
  color?: string;
  dateCreated?: string;
  productionStart?: string;
  finishline?: string;
  timelineEvents?: TimelineEvent[];
  address?: string;
  company?: string;
  clientName?: string;
  invoiceBrandName?: string;
  invoiceBrandAddress?: string;
  clientAddress?: string;
  invoiceBrandPhone?: string;
  clientPhone?: string;
  clientEmail?: string;
};

export type CategoryOption =
  | "AUDIO-VISUAL"
  | "CLIENT-SERVICES-VIP"
  | "CONTINGENCY-MISC"
  | "DECOR"
  | "DESIGN"
  | "FABRICATION"
  | "FOOD-BEVERAGE"
  | "GRAPHICS"
  | "INSTALLATION-MATERIALS"
  | "LABOR"
  | "LIGHTING"
  | "MERCH-SWAG"
  | "PARKING-FUEL-TOLLS"
  | "PERMITS-INSURANCE"
  | "PRODUCTION-MGMT"
  | "RENTALS"
  | "STORAGE"
  | "TECH-INTERACTIVES"
  | "TRAVEL"
  | "TRUCKING"
  | "VENUE-LOCATION-FEES"
  | "WAREHOUSE";

export type UnitOption =
  | "Each"
  | "Hrs"
  | "Days"
  | "EA"
  | "PCS"
  | "Box"
  | "LF"
  | "SQFT"
  | "KG";

// Re-export API type for convenience since the backend response matches TimelineEvent.
export type { ApiTimelineEvent };
