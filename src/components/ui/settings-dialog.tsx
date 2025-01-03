import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

import { Switch } from "./switch";
import { useSettings } from "../../lib/stores/settings";
import { Separator } from "./separator";
import { ThemeToggle } from "../theme-toggle";
import { Slider } from "./slider";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings, updateConfirmation } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your editor preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Appearance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Color Theme
                </span>
                <ThemeToggle />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Font Size
                    </span>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {settings.editor?.fontSize}px
                    </span>
                  </div>
                  <Slider
                    value={[settings.editor?.fontSize || 16]}
                    min={12}
                    max={24}
                    step={1}
                    onValueChange={([value]) =>
                      updateSettings({
                        editor: { ...settings.editor, fontSize: value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Line Height
                    </span>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {settings.editor?.lineHeight}
                    </span>
                  </div>
                  <Slider
                    value={[settings.editor?.lineHeight || 1.5]}
                    min={1}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) =>
                      updateSettings({
                        editor: { ...settings.editor, lineHeight: value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-4">Confirmations</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Confirm before deleting files
              </span>
              <Switch
                id="delete-confirmation"
                checked={settings.confirmations.fileDelete}
                onCheckedChange={(checked) =>
                  updateConfirmation("fileDelete", checked)
                }
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
