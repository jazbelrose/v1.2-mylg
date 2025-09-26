// ClientInvoicePreviewModal.tsx
import React from "react";

import InvoicePreviewModal from "@/dashboard/project/features/budget/components/InvoicePreviewModal";
import { BudgetProvider } from "@/dashboard/project/features/budget/context/BudgetProvider";
import { BudgetRevisionSessionProvider } from "@/dashboard/project/features/budget/context/BudgetRevisionSessionContext";
import { Project } from "@/app/contexts/DataProvider";

interface RevisionLike {
  revision?: number;
  [k: string]: unknown;
}

interface ClientInvoicePreviewModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  revision: RevisionLike;
  project: Project;
}

const ClientInvoicePreviewModal: React.FC<ClientInvoicePreviewModalProps> = ({
  isOpen,
  onRequestClose,
  revision,
  project,
}) => (
  <BudgetRevisionSessionProvider>
    <BudgetProvider projectId={project?.projectId}>
      <InvoicePreviewModal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        revision={revision}
        project={project}
        showSidebar={false}
        allowSave={false}
      />
    </BudgetProvider>
  </BudgetRevisionSessionProvider>
);

export default ClientInvoicePreviewModal;











