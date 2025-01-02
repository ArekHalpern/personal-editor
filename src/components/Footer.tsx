import { SaveIndicator } from "./SaveIndicator";
import { TimeStamp } from "./TimeStamp";

interface FooterProps {
  lastSaved: Date | null;
  saving: boolean;
  createdAt?: Date;
  isRightBarCollapsed: boolean;
  rightBarWidth: number;
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
}

export function Footer({
  lastSaved,
  saving,
  createdAt,
  isRightBarCollapsed,
  rightBarWidth,
  isSidebarCollapsed,
  sidebarWidth,
}: FooterProps) {
  return (
    <div
      className="fixed bottom-0 h-[40px] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10"
      style={{
        left: isSidebarCollapsed ? "3.5rem" : `${sidebarWidth}px`,
        right: isRightBarCollapsed ? "3.5rem" : `${rightBarWidth}px`,
      }}
    >
      <div className="flex h-full items-center justify-between px-4">
        <SaveIndicator lastSaved={lastSaved} saving={saving} />
        <TimeStamp createdAt={createdAt} />
      </div>
    </div>
  );
}
