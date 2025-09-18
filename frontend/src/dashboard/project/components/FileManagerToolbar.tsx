import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import Dropdown from "./Dropdown";
import type { FilterValue, FolderOption, SortOption } from "./fileManagerTypes";
import styles from "./file-manager.module.css";

interface FileManagerToolbarProps {
  folderKey: string;
  systemFolders: FolderOption[];
  onFolderChange: (key: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterOption: FilterValue;
  filterOptions: Array<{ value: FilterValue; label: string }>;
  onFilterChange: (value: FilterValue) => void;
  sortOption: SortOption;
  sortOptions: Array<{ value: SortOption; label: string }>;
  onSortChange: (value: SortOption) => void;
  onToggleView: () => void;
  layoutIcon: IconDefinition;
  onClose: () => void;
  renderFolderIcon: (key: string, size?: number) => React.ReactNode;
}

export const FileManagerToolbar = ({
  folderKey,
  systemFolders,
  onFolderChange,
  searchTerm,
  onSearchChange,
  filterOption,
  filterOptions,
  onFilterChange,
  sortOption,
  sortOptions,
  onSortChange,
  onToggleView,
  layoutIcon,
  onClose,
  renderFolderIcon,
}: FileManagerToolbarProps) => {
  return (
    <div className={styles.modalHeader}>
      <div className={styles.folderTabs}>
        {systemFolders.map((folder) => (
          <button
            key={folder.key}
            className={`${styles.tabButton} ${folderKey === folder.key ? styles.activeTab : ""}`}
            onClick={() => onFolderChange(folder.key)}
          >
            {renderFolderIcon(folder.key, 16)} {folder.name}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
        <Dropdown
          label="Filter files"
          options={filterOptions}
          value={filterOption}
          onChange={onFilterChange}
        />
        <Dropdown label="Sort files" options={sortOptions} value={sortOption} onChange={onSortChange} />
        <button className={styles.iconButton} onClick={onToggleView} aria-label="Toggle view">
          <FontAwesomeIcon icon={layoutIcon} />
        </button>
        <button className={styles.iconButton} onClick={onClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );
};

export default FileManagerToolbar;









