import React, { useState, useMemo } from "react";
import { FiChevronDown, FiChevronUp, FiFilter, FiSearch, FiDownload, FiEyeOff, FiEye } from "react-icons/fi";

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  loading?: boolean;
}

export default function DataTable<T extends { id: string | number }>({
  data,
  columns,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [colVisibility, setColVisibility] = useState<Set<keyof T>>(new Set(columns.filter(c => c.visible === false).map(c => c.key)));
  const [filters, setFilters] = useState<Record<string, string>>( {} );

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Filtering, searching, sorting
  const filteredData = useMemo(() => {
    let filtered = data;
    // Global search
    if (debouncedSearch) {
      filtered = filtered.filter(row =>
        columns.some(col => String(row[col.key]).toLowerCase().includes(debouncedSearch.toLowerCase()))
      );
    }
    // Column filters
    for (const key in filters) {
      if (filters[key]) {
        filtered = filtered.filter(row => String(row[key as keyof T]).toLowerCase().includes(filters[key].toLowerCase()));
      }
    }
    // Sorting
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [data, debouncedSearch, filters, sortKey, sortAsc, columns]);

  // Pagination
  const total = filteredData.length;
  const totalPages = Math.ceil(total / pageSize);
  const pagedData = useMemo(() => filteredData.slice((page - 1) * pageSize, page * pageSize), [filteredData, page, pageSize]);

  // Export
  const handleExport = (type: "csv" | "excel") => {
    // For brevity, only CSV implemented here
    const visibleCols = columns.filter(col => !colVisibility.has(col.key));
    const rows = [
      visibleCols.map(col => col.label).join(","),
      ...filteredData.map(row => visibleCols.map(col => row[col.key]).join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-export.${type}`;
    a.click();
  };

  // Bulk select
  const allSelected = pagedData.length > 0 && pagedData.every(row => selected.has(row.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set([...selected, ...pagedData.map(row => row.id)]));
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FiSearch className="text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary"
            aria-label="Global search"
          />
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm hover:bg-primary/10"
            onClick={() => handleExport("csv")}
            aria-label="Export CSV"
          >
            <FiDownload /> CSV
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm hover:bg-primary/10"
            onClick={() => handleExport("excel")}
            aria-label="Export Excel"
          >
            <FiDownload /> Excel
          </button>
          <div className="relative">
            <button className="px-2 py-1 border rounded text-sm flex items-center gap-1" aria-label="Toggle columns">
              <FiEye />
            </button>
            <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-[120px] p-2">
              {columns.map(col => (
                <label key={String(col.key)} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!colVisibility.has(col.key)}
                    onChange={() => {
                      setColVisibility(v => {
                        const newSet = new Set(v);
                        if (newSet.has(col.key)) newSet.delete(col.key);
                        else newSet.add(col.key);
                        return newSet;
                      });
                    }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Table */}
      <table className="min-w-full border rounded-lg bg-white dark:bg-gray-900">
        <thead className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b">
          <tr>
            <th className="px-2 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all rows" /></th>
            {columns.filter(col => !colVisibility.has(col.key)).map(col => (
              <th key={String(col.key)} className="px-2 py-2 text-left text-sm font-semibold cursor-pointer select-none" onClick={() => {
                if (col.sortable) {
                  setSortKey(col.key);
                  setSortAsc(sortKey === col.key ? !sortAsc : true);
                }
              }}>
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (sortAsc ? <FiChevronUp /> : <FiChevronDown />)}
                  {col.filterable && (
                    <span className="ml-1"><FiFilter /></span>
                  )}
                </div>
                {col.filterable && (
                  <input
                    type="text"
                    value={filters[String(col.key)] || ""}
                    onChange={e => setFilters(f => ({ ...f, [String(col.key)]: e.target.value }))}
                    className="border rounded px-1 py-0.5 text-xs mt-1 w-full"
                    aria-label={`Filter ${col.label}`}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length + 1} className="text-center py-8">Loading...</td></tr>
          ) : pagedData.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="text-center py-8">No data found</td></tr>
          ) : (
            pagedData.map(row => (
              <tr key={row.id} className={selected.has(row.id) ? "bg-primary/10" : ""}>
                <td className="px-2 py-1"><input type="checkbox" checked={selected.has(row.id)} onChange={() => {
                  setSelected(sel => {
                    const newSel = new Set(sel);
                    if (newSel.has(row.id)) newSel.delete(row.id);
                    else newSel.add(row.id);
                    return newSel;
                  });
                }} aria-label={`Select row ${row.id}`} /></td>
                {columns.filter(col => !colVisibility.has(col.key)).map(col => (
                  <td key={String(col.key)} className="px-2 py-1 text-sm">
                    {col.render ? col.render(row[col.key], row) : (typeof row[col.key] === 'object' && row[col.key] !== null ? JSON.stringify(row[col.key]) : (row[col.key] as React.ReactNode))}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="border rounded px-2 py-1 text-sm"
            title="Rows per page"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 border rounded text-sm">Prev</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-2 py-1 border rounded text-sm">Next</button>
        </div>
      </div>
    </div>
  );
}
