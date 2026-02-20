import { X } from "lucide-react";
import type { AnalyzedIssue } from "../types";

interface FeatureFilterProps {
  issues: AnalyzedIssue[];
  selectedFeature: string | null;
  onSelectFeature: (feature: string | null) => void;
}

export default function FeatureFilter({
  issues,
  selectedFeature,
  onSelectFeature,
}: FeatureFilterProps) {
  const features = Array.from(new Set(issues.map((i) => i.feature))).sort();
  const featureCounts = new Map<string, number>();
  for (const issue of issues) {
    featureCounts.set(issue.feature, (featureCounts.get(issue.feature) || 0) + 1);
  }

  if (features.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-gray-500 font-medium mr-1">Feature:</span>
      <button
        onClick={() => onSelectFeature(null)}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          selectedFeature === null
            ? "bg-gray-800 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {features.map((feature) => (
        <button
          key={feature}
          onClick={() =>
            onSelectFeature(selectedFeature === feature ? null : feature)
          }
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            selectedFeature === feature
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {feature}
          <span className="opacity-70">({featureCounts.get(feature)})</span>
          {selectedFeature === feature && <X size={12} />}
        </button>
      ))}
    </div>
  );
}
