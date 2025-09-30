import React from "react";
import { Table } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import styles from "@/dashboard/project/features/budget/pages/budget-page.module.css";

const TABLE_HEADER_FOOTER = 110;

type BudgetItem = Record<string, unknown> & {
  budgetItemId: string;
  key: string;
};

interface BudgetItemsTableProps {
  dataSource: BudgetItem[];
  columns: ColumnsType<BudgetItem>;
  selectedRowKeys: string[];
  lockedLines: string[];
  handleTableChange: TableProps<BudgetItem>['onChange'];
  openEditModal: (record: BudgetItem) => void;
  openDeleteModal: (ids: string[]) => void;
  tableRef: React.RefObject<HTMLDivElement>;
  tableHeight: number;
  pageSize: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

const BudgetItemsTable: React.FC<BudgetItemsTableProps> = React.memo(
  ({
    dataSource,
    columns,
    selectedRowKeys,
    lockedLines,
    handleTableChange,
    openEditModal,
    openDeleteModal,
    tableRef,
    tableHeight,
    pageSize,
    currentPage,
    setCurrentPage,
    setPageSize,
  }) => {
    return (
      <div ref={tableRef} style={{ width: "100%", fontSize: "10px" }}>
        <Table<BudgetItem>
          dataSource={dataSource}
          columns={columns.map((col) => ({
            ...col,
            ellipsis: col.key !== "actions" && col.key !== "events",
          }))}
          locale={{
            emptyText: (
              <div className={styles.emptyPlaceholder}>No budget items to display</div>
            ),
          }}
          onChange={handleTableChange}
          rowClassName={(record) =>
            `${styles.clickableRow}${
              selectedRowKeys.includes(record.budgetItemId)
                ? ` ${styles.selectedRow}`
                : ""
            }${
              lockedLines.includes(record.budgetItemId)
                ? ` ${styles.lockedRow}`
                : ""
            }`
          }
          onRow={(record) => ({
            onClick: () => openEditModal(record),
            tabIndex: lockedLines.includes(record.budgetItemId) ? -1 : 0,
            onKeyDown: (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                openEditModal(record);
              } else if (e.key === " ") {
                e.preventDefault();
                openDeleteModal([record.budgetItemId]);
              }
            },
          })}
          pagination={{
            pageSize,
            current: currentPage,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            position: ["bottomRight"],
            showTotal: (total, range) => `Showing ${range[0]}–${range[1]} of ${total} items`,
            size: "small",
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) setPageSize(size);
            },
          }}
          scroll={{ y: Math.max(0, tableHeight - TABLE_HEADER_FOOTER) }}
          className={styles.tableMinHeight}
          style={{ height: tableHeight }}
        />
      </div>
    );
  }
);

export default BudgetItemsTable;












