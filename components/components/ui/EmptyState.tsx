import React from "react";
import { FiInbox, FiSearch, FiAlertTriangle, FiCloudOff } from "react-icons/fi";

interface EmptyStateProps {
  type: "no-data" | "no-results" | "error";
  message?: string;
  action?: React.ReactNode;
}

const iconMap = {
  "no-data": <FiInbox className="text-5xl text-muted-foreground mb-2" />,
  "no-results": <FiSearch className="text-5xl text-muted-foreground mb-2" />,
  "error": <FiAlertTriangle className="text-5xl text-danger mb-2" />,
};

export default function EmptyState({ type, message, action }: EmptyStateProps) {
  let defaultMsg = "";
  if (type === "no-data") defaultMsg = "No data uploaded yet.";
  if (type === "no-results") defaultMsg = "No results found.";
  if (type === "error") defaultMsg = "Error loading data.";
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {iconMap[type]}
      <div className="text-lg font-semibold mb-2">{message || defaultMsg}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
