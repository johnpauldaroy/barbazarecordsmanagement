import { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { cn } from '../lib/utils';

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
  toolbarActions = null,
  emptyMessage = 'No records found.',
  initialSortKey,
  initialSortDirection = 'asc',
  initialSearchValue = '',
  rowFilter = null,
  gridTemplate, // preserved for backward compatibility with existing call sites
}) {
  const [searchValue, setSearchValue] = useState(initialSearchValue);
  const [sortKey, setSortKey] = useState(initialSortKey ?? columns[0]?.key);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  void gridTemplate;

  useEffect(() => {
    setSearchValue(initialSearchValue);
  }, [initialSearchValue]);

  const activeSortColumn = useMemo(
    () => columns.find((column) => column.key === sortKey),
    [columns, sortKey]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (rowFilter && !rowFilter(row)) {
          return false;
        }

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
      }),
    [columns, rowFilter, rows, searchValue]
  );

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((left, right) => {
        const leftValue = activeSortColumn?.getSortValue ? activeSortColumn.getSortValue(left) : left[sortKey];
        const rightValue = activeSortColumn?.getSortValue
          ? activeSortColumn.getSortValue(right)
          : right[sortKey];

        const comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });

        return sortDirection === 'asc' ? comparison : comparison * -1;
      }),
    [activeSortColumn, filteredRows, sortDirection, sortKey]
  );

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
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
          />
        </label>
        {toolbarActions ? <div className="data-table__actions">{toolbarActions}</div> : null}
      </div>

      <Card className="ui-table-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  <button
                    type="button"
                    className={cn(
                      'table-header-button',
                      sortKey === column.key ? 'table-header-button--active' : ''
                    )}
                    onClick={() => handleSort(column.key)}
                  >
                    <span>{column.label}</span>
                    {sortKey === column.key ? (
                      <span aria-hidden="true">{sortDirection === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    ) : null}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length ? (
              sortedRows.map((row) => {
                const currentRowKey = row[rowKey];
                const isSelected = selectedKey === currentRowKey;

                return (
                  <TableRow
                    key={currentRowKey}
                    className={cn('table-row--interactive', isSelected ? 'table-row--selected' : '')}
                    data-state={isSelected ? 'selected' : undefined}
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
                      <TableCell key={column.key} className="table-cell">
                        {column.render ? column.render(row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="data-table__empty">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default InteractiveTable;

