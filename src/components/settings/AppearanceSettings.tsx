import { ThemeToggle } from "../theme-toggle";
import { Slider } from "../ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useSettings } from "../../lib/stores/settings";

const FONT_OPTIONS = [
  {
    label: "Roboto",
    value: "Roboto",
    style: { fontFamily: "Roboto" },
    description: "Modern sans-serif",
  },
  {
    label: "Playfair Display",
    value: "Playfair Display",
    style: { fontFamily: "Playfair Display" },
    description: "Elegant serif",
  },
  {
    label: "JetBrains Mono",
    value: "JetBrains Mono",
    style: { fontFamily: "JetBrains Mono" },
    description: "Monospace",
  },
  {
    label: "Merriweather",
    value: "Merriweather",
    style: { fontFamily: "Merriweather" },
    description: "Classic serif",
  },
  {
    label: "Space Grotesk",
    value: "Space Grotesk",
    style: { fontFamily: "Space Grotesk" },
    description: "Modern geometric",
  },
  {
    label: "Inter",
    value: "Inter",
    style: { fontFamily: "Inter" },
    description: "Clean sans-serif",
  },
];

export function AppearanceSettings() {
  const { settings, updateSettings } = useSettings();
  const editorSettings = settings.editor || {
    fontSize: 16,
    lineHeight: 1.5,
    fontFamily: "Roboto",
    fontWeight: 400,
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Theme</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Color Theme</span>
          <ThemeToggle />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-4">Editor Typography</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Font Family</label>
            <Select
              value={editorSettings.fontFamily || "Roboto"}
              onValueChange={(value: string) =>
                updateSettings({
                  editor: { ...editorSettings, fontFamily: value },
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select font">
                  <span
                    style={{
                      fontFamily: editorSettings.fontFamily || "Roboto",
                    }}
                    className="flex items-center"
                  >
                    <span className="text-base">
                      {editorSettings.fontFamily || "Roboto"}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <div className="flex flex-col">
                      <span style={font.style} className="text-base">
                        {font.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {font.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Font Size</span>
              <span className="text-sm w-8 text-right">
                {editorSettings.fontSize || 16}
              </span>
            </div>
            <Slider
              value={[editorSettings.fontSize || 16]}
              min={12}
              max={24}
              step={1}
              onValueChange={([value]) =>
                updateSettings({
                  editor: { ...editorSettings, fontSize: value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Font Weight</span>
              <span className="text-sm w-8 text-right">
                {editorSettings.fontWeight || 400}
              </span>
            </div>
            <Slider
              value={[editorSettings.fontWeight || 400]}
              min={300}
              max={700}
              step={100}
              onValueChange={([value]) =>
                updateSettings({
                  editor: { ...editorSettings, fontWeight: value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Line Height</span>
              <span className="text-sm w-8 text-right">
                {editorSettings.lineHeight || 1.5}
              </span>
            </div>
            <Slider
              value={[editorSettings.lineHeight || 1.5]}
              min={1}
              max={2}
              step={0.1}
              onValueChange={([value]) =>
                updateSettings({
                  editor: { ...editorSettings, lineHeight: value },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
