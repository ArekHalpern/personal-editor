import { TimeStamp } from "./TimeStamp";
import { Spinner } from "./ui/spinner";
import { cn } from "../lib/utils/cn";

interface FooterProps {
  lastSaved: Date | null;
  saving: boolean;
  createdAt?: Date;
}

export function Footer({ lastSaved, saving, createdAt }: FooterProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div
        className={cn(
          "text-xs transition-opacity duration-200",
          saving ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {saving ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span>Saving...</span>
          </div>
        ) : lastSaved ? (
          <span>Saved {formatTime(lastSaved)}</span>
        ) : (
          <span>Not saved yet</span>
        )}
      </div>
      <TimeStamp createdAt={createdAt} />
    </div>
  );
}

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 5) {
    return "just now";
  } else if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes === 1) {
    return "1 minute ago";
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours === 1) {
    return "1 hour ago";
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
}
