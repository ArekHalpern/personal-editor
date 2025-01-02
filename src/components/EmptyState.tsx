import { FilePlus } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  onCreateFile: () => void;
}

export function EmptyState({ onCreateFile }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <FilePlus className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-medium">No files yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create a new file to start writing and using AI enhancements.
        </p>
      </div>
      <Button onClick={onCreateFile} className="gap-2">
        <FilePlus className="h-4 w-4" />
        Create New File
      </Button>
    </div>
  );
}
