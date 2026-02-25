import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  counts?: Map<string, number>;
  colorMap?: Record<string, string>;
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  counts,
  colorMap,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  };

  const clearAll = () => {
    onChange(new Set());
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {label}
        {selected.size > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
            {selected.size}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {selected.size > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            clearAll();
          }}
          className="ml-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title={`Clear ${label} filter`}
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-64 overflow-y-auto">
          {options.map((option) => {
            const isSelected = selected.has(option);
            const badgeClass = colorMap?.[option] ?? "bg-gray-100 text-gray-700";
            return (
              <button
                key={option}
                onClick={() => toggle(option)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                  {option}
                </span>
                {counts && counts.has(option) && (
                  <span className="ml-auto text-xs text-gray-400">{counts.get(option)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
