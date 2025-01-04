import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { SettingsSidebar } from "../settings/SettingsSidebar";
import { GeneralSettings } from "../settings/GeneralSettings";
import { AppearanceSettings } from "../settings/AppearanceSettings";
import { APISettings } from "../settings/APISettings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState("general");

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "api":
        return <APISettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <div className="flex h-[80vh]">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Configure your editor preferences.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6">{renderSection()}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
