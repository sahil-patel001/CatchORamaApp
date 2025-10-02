import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Legacy column interface for backward compatibility
interface LegacyColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
}

// Modern column interface using TanStack Table
interface ModernColumn<T> {
  accessorKey: keyof T | string;
  header: string | ((props: { column: any }) => React.ReactNode);
  cell?: (props: {
    row: { original: T };
    getValue: () => any;
  }) => React.ReactNode;
  enableSorting?: boolean;
  sortingFn?: string | ((rowA: any, rowB: any, columnId: string) => number);
}

type Column<T> = LegacyColumn<T> | ModernColumn<T>;

// Type guard to check if column is modern format
function isModernColumn<T>(column: Column<T>): column is ModernColumn<T> {
  return "accessorKey" in column;
}

interface ExtraAction<T> {
  label: string | JSX.Element;
  onClick: (item: T) => void;
  icon?: JSX.Element;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKey: keyof T | string;
  searchPlaceholder: string;
  addButtonText?: string;
  onAdd?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  extraActions?: ExtraAction<T>[];
  filterComponent?: React.ReactNode;
  hideAddButton?: boolean;
  hideEditButton?: boolean;
  hideDeleteButton?: boolean;
  enableSelection?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (selectedItems: T[]) => void;
}

export const DataTable = React.memo(
  <T extends { id?: string | number; _id?: string | number }>({
    data,
    columns,
    searchKey,
    searchPlaceholder,
    addButtonText,
    onAdd,
    onView,
    onEdit,
    onDelete,
    extraActions = [],
    filterComponent,
    hideAddButton = false,
    hideEditButton = false,
    hideDeleteButton = false,
    enableSelection = false,
    selectedItems = [],
    onSelectionChange,
  }: DataTableProps<T>) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
      {}
    );
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [globalFilter, setGlobalFilter] = useState("");

    // Memoized helper function to get nested values
    const getValue = useCallback((item: any, path: string): any => {
      return path.split(".").reduce((obj, key) => obj?.[key], item);
    }, []);

    // Memoized helper function to get item ID
    const getItemId = useCallback((item: T): string => {
      return String(item._id || item.id || "");
    }, []);

    // Sync external selectedItems with internal rowSelection
    useEffect(() => {
      if (enableSelection && selectedItems) {
        const newRowSelection: RowSelectionState = {};
        selectedItems.forEach((item) => {
          const itemId = getItemId(item);
          if (itemId) {
            newRowSelection[itemId] = true;
          }
        });
        setRowSelection(newRowSelection);
      }
    }, [selectedItems, enableSelection]);

    // Convert legacy columns to TanStack Table format
    const tableColumns = useMemo<ColumnDef<T>[]>(() => {
      const convertedColumns: ColumnDef<T>[] = [];

      // Add selection column if enabled
      if (enableSelection) {
        convertedColumns.push({
          id: "select",
          header: ({ table }) => (
            <div className="flex items-center justify-center pr-4">
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
                className={
                  table.getIsSomePageRowsSelected() &&
                  !table.getIsAllPageRowsSelected()
                    ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground opacity-50"
                    : ""
                }
              />
            </div>
          ),
          cell: ({ row }) => (
            <div className="flex items-center justify-center pr-4">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
          size: 60, // Set a fixed width for the selection column
        });
      }

      // Convert user-defined columns
      columns.forEach((column) => {
        if (isModernColumn(column)) {
          // Modern format
          const modernCol: ColumnDef<T> = {
            accessorKey: column.accessorKey as string,
            header:
              typeof column.header === "function"
                ? column.header
                : ({ column: col }) => {
                    const isSortable = column.enableSorting !== false;
                    if (!isSortable) {
                      return <div>{column.header as string}</div>;
                    }

                    return (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          col.toggleSorting(col.getIsSorted() === "asc");
                        }}
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                      >
                        <span>{column.header as string}</span>
                        {col.getIsSorted() === "desc" ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : col.getIsSorted() === "asc" ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    );
                  },
            cell:
              column.cell || (({ getValue }) => getValue() as React.ReactNode),
            enableSorting: column.enableSorting !== false,
            sortingFn: column.sortingFn as any,
          };
          convertedColumns.push(modernCol);
        } else {
          // Legacy format - convert to modern
          const legacyCol: ColumnDef<T> = {
            id: column.key as string,
            accessorFn: (row) => getValue(row, column.key as string),
            header: ({ column: col }) => {
              const isSortable = column.sortable !== false;
              if (!isSortable) {
                return <div>{column.header}</div>;
              }

              return (
                <Button
                  variant="ghost"
                  onClick={() => {
                    col.toggleSorting(col.getIsSorted() === "asc");
                  }}
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                >
                  <span>{column.header}</span>
                  {col.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                  ) : col.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                  )}
                </Button>
              );
            },
            cell: ({ row, getValue }) => {
              const value = getValue();
              if (column.render) {
                return column.render(value, row.original);
              }
              return value as React.ReactNode;
            },
            enableSorting: column.sortable !== false,
            // Add custom sorting function for nested properties
            sortingFn:
              typeof column.key === "string" && column.key.includes(".")
                ? (rowA: any, rowB: any, columnId: string) => {
                    const aValue = getValue(
                      rowA.original,
                      column.key as string
                    );
                    const bValue = getValue(
                      rowB.original,
                      column.key as string
                    );

                    // Handle null/undefined values
                    if (aValue == null && bValue == null) return 0;
                    if (aValue == null) return 1;
                    if (bValue == null) return -1;

                    // Compare values
                    if (aValue < bValue) return -1;
                    if (aValue > bValue) return 1;
                    return 0;
                  }
                : "auto",
          };
          convertedColumns.push(legacyCol);
        }
      });

      // Add actions column if needed
      if (onView || onEdit || onDelete || extraActions.length > 0) {
        convertedColumns.push({
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          cell: ({ row }) => {
            const item = row.original;
            return (
              <div className="flex items-center justify-end gap-2">
                {extraActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(item);
                    }}
                    className="h-8 w-8"
                    title={typeof action.label === "string" ? action.label : ""}
                  >
                    {action.icon || action.label}
                  </Button>
                ))}
                {onView && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(item);
                    }}
                    className="h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && !hideEditButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && !hideDeleteButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          },
          enableSorting: false,
        });
      }

      return convertedColumns;
    }, [
      columns,
      enableSelection,
      onView,
      onEdit,
      onDelete,
      extraActions,
      hideEditButton,
      hideDeleteButton,
    ]);

    // Initialize TanStack Table
    const table = useReactTable({
      data,
      columns: tableColumns,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      enableRowSelection: enableSelection,
      getRowId: getItemId,
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
        globalFilter,
      },
      initialState: {
        pagination: {
          pageSize: 10,
        },
      },
      // Enable multi-sort with shift key
      enableMultiSort: true,
      // Ensure stable sorting
      manualSorting: false,
      // Keep selected rows when data changes
      enableSubRowSelection: false,
    });

    // Handle selection changes
    useEffect(() => {
      if (enableSelection && onSelectionChange) {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const newSelectedItems = selectedRows.map((row) => row.original);

        // Only call onSelectionChange if the selection actually changed
        const currentIds = new Set(newSelectedItems.map(getItemId));
        const previousIds = new Set(selectedItems.map(getItemId));

        const hasChanged =
          currentIds.size !== previousIds.size ||
          [...currentIds].some((id) => !previousIds.has(id));

        if (hasChanged) {
          onSelectionChange(newSelectedItems);
        }
      }
    }, [rowSelection]);

    // Handle search filtering
    const handleSearch = (value: string) => {
      setGlobalFilter(value);
    };

    return (
      <div className="space-y-4">
        {/* Header with search, filter, and add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter ?? ""}
                onChange={(event) => handleSearch(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
            {filterComponent && (
              <div className="flex items-center">{filterComponent}</div>
            )}

            {onAdd && addButtonText && !hideAddButton && (
              <Button onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {addButtonText}
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-default"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-2 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DataTable.displayName = "DataTable";
