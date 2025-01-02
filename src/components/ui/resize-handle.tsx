import { GripVertical } from "lucide-react";
import { cn } from "../../lib/utils";

interface ResizeHandleProps {
  className?: string;
  onResize: (delta: number) => void;
}

export function ResizeHandle({ className, onResize }: ResizeHandleProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.pageX - startX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className={cn(
        "absolute top-0 right-0 w-1 h-full cursor-col-resize group/resize hover:bg-accent",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover/resize:opacity-100">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
