interface TimeStampProps {
  createdAt: Date | undefined;
}

export function TimeStamp({ createdAt }: TimeStampProps) {
  if (!createdAt) return null;

  return (
    <div className="text-xs text-muted-foreground">
      Created {formatDate(createdAt)}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
