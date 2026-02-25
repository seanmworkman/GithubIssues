import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { SortField, SortDirection } from "../types";

interface SortControlsProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
}

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "priority", label: "Priority" },
  { field: "difficulty", label: "Difficulty" },
  { field: "feature", label: "Feature" },
];

export default function SortControls({
  sortField,
  sortDirection,
  onSortChange,
}: SortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 font-medium">Sort by:</span>
      {SORT_OPTIONS.map((option) => {
        const isActive = sortField === option.field;
        return (
          <button
            key={option.field}
            onClick={() => onSortChange(option.field)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {option.label}
            {isActive ? (
              sortDirection === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              )
            ) : (
              <ArrowUpDown size={14} className="text-gray-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
