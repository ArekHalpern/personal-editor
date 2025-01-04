import { Switch } from "../ui/switch";
import { useSettings } from "../../lib/stores/settings";

export function GeneralSettings() {
  const { settings, updateConfirmation } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Confirmations</h3>
        <div className="space-y-4">
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
    </div>
  );
}
