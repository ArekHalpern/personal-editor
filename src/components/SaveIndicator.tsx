// SaveIndicator component for displaying save status
interface SaveIndicatorProps {
  lastSaved: Date | null;
  saving: boolean;
}

export function SaveIndicator({ lastSaved, saving }: SaveIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {saving ? (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Saved {formatTime(lastSaved)}</span>
        </>
      ) : (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
          <span>No changes</span>
        </>
      )}
    </div>
  );
}

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 5) {
    return "just now";
  } else if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (seconds < 120) {
    return "1m ago";
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  } else if (seconds < 7200) {
    return "1h ago";
  } else {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}
