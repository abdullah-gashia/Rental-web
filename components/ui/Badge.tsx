interface BadgeProps {
  type: "sale" | "rent" | "ship" | "new";
  label: string;
}

export default function Badge({ type, label }: BadgeProps) {
  const classMap: Record<string, string> = {
    sale: "badge-sale",
    rent: "badge-rent",
    ship: "badge-ship",
    new: "badge-new",
  };

  return <span className={`badge ${classMap[type] || ""}`}>{label}</span>;
}
