// Shared Components Barrel Export
export { default as ProjectHeader } from './ProjectHeader';
export { default as ProjectCalendar } from './ProjectCalendar';
export { default as ProjectPageLayout } from './ProjectPageLayout';
export { default as QuickLinksComponent } from './QuickLinksComponent';
export type { QuickLinksRef } from './QuickLinksComponent';
export { default as LocationComponent } from './LocationComponent';
export { default as TeamModal } from './TeamModal';
export { default as PDFPreview } from './PDFPreview';
export { default as ClientInvoicePreviewModal } from './ClientInvoicePreviewModal';
export { default as ChatPanel } from './ChatPanel';
export { default as Dropdown } from '../FileManager/Dropdown';

// Hooks
export { useFileManagerState } from './hooks/useFileManagerState';
export { useFileMessenger } from './hooks/useFileMessenger';
export { useFileTransfers } from './hooks/useFileTransfers';
