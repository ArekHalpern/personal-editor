import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Checkbox } from "./checkbox";

interface ConfirmDialogProps {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (neverAskAgain: boolean) => void;
}

export function ConfirmDialog({
  title,
  description,
  open,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  const [neverAskAgain, setNeverAskAgain] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="never-ask"
            checked={neverAskAgain}
            onCheckedChange={(checked) => setNeverAskAgain(checked as boolean)}
          />
          <label
            htmlFor="never-ask"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Don't ask me again
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(neverAskAgain);
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
