import { useState } from 'react';

function normalizeValue(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function InteractiveTable({
  columns,
  rows,
  rowKey,
  selectedKey,
  onSelectRow,
  searchLabel,
  searchPlaceholder,
  emptyMessage = 'No records found.',
  initialSortKey,
  initialSortDirection = 'asc',
  gridTemplate,
}) {
  const [searchValue, setSearchValue] = useState('');
  const [sortKey, setSortKey] = useState(initialSortKey ?? columns[0]?.key);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  const activeSortColumn = columns.find((column) => column.key === sortKey);

  const filteredRows = rows.filter((row) => {
    const query = normalizeValue(searchValue);

    if (!query) {
      return true;
    }

    return columns.some((column) => {
      const searchText = column.getSearchText
        ? column.getSearchText(row)
        : column.getSortValue
          ? column.getSortValue(row)
          : row[column.key];

      return normalizeValue(searchText).includes(query);
    });
  });

  const sortedRows = [...filteredRows].sort((left, right) => {
    const leftValue = activeSortColumn?.getSortValue ? activeSortColumn.getSortValue(left) : left[sortKey];
    const rightValue = activeSortColumn?.getSortValue
      ? activeSortColumn.getSortValue(right)
      : right[sortKey];

    const comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    return sortDirection === 'asc' ? comparison : comparison * -1;
  });

  const handleSort = (columnKey) => {
    if (sortKey === columnKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(columnKey);
    setSortDirection('asc');
  };

  return (
    <div className="data-table-block">
      <div className="data-table__toolbar">
        <label className="data-table__search">
          <span className="sr-only">{searchLabel}</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
          />
        </label>
      </div>

      <div className="data-table">
        <div className="table-row table-row--header" style={{ gridTemplateColumns: gridTemplate }}>
          {columns.map((column) => (
            <button
              key={column.key}
              type="button"
              className={`table-header-button ${
                sortKey === column.key ? 'table-header-button--active' : ''
              }`}
              onClick={() => handleSort(column.key)}
            >
              <span>{column.label}</span>
            </button>
          ))}
        </div>

        {sortedRows.length ? (
          sortedRows.map((row) => {
            const currentRowKey = row[rowKey];
            const isSelected = selectedKey === currentRowKey;

            return (
              <div
                key={currentRowKey}
                className={`table-row table-row--interactive ${
                  isSelected ? 'table-row--selected' : ''
                }`}
                style={{ gridTemplateColumns: gridTemplate }}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRow?.(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectRow?.(row);
                  }
                }}
              >
                {columns.map((column) => (
                  <div key={column.key} className="table-cell">
                    {column.render ? column.render(row) : row[column.key]}
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          <div className="data-table__empty">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}

export default InteractiveTable;
