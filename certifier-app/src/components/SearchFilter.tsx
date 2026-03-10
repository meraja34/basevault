interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: { label: string; value: string }[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  sortOptions?: { label: string; value: string }[];
  activeSort?: string;
  onSortChange?: (value: string) => void;
  resultCount?: number;
}

export default function SearchFilter({
  searchValue,
  onSearchChange,
  placeholder = 'Search...',
  filters,
  activeFilter,
  onFilterChange,
  sortOptions,
  activeSort,
  onSortChange,
  resultCount,
}: SearchFilterProps) {
  return (
    <div className="search-filter">
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchValue && (
            <button className="search-clear" onClick={() => onSearchChange('')}>&times;</button>
          )}
        </div>
        {sortOptions && onSortChange && (
          <select className="sort-select" value={activeSort} onChange={(e) => onSortChange(e.target.value)}>
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>
      {filters && onFilterChange && (
        <div className="filter-chips">
          {filters.map((f) => (
            <button
              key={f.value}
              className={`filter-chip ${activeFilter === f.value ? 'filter-chip-active' : ''}`}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {resultCount !== undefined && (
        <p className="search-result-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
