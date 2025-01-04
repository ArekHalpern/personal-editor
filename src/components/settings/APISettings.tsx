import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useSettings } from "../../lib/stores/settings";

export function APISettings() {
  const { settings, updateSettings } = useSettings();
  const openaiSettings = settings.api?.openai || {
    models: ["gpt-4", "gpt-3.5-turbo"],
    selectedModel: "gpt-4",
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-4">OpenAI Configuration</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="openai-key"
              className="text-sm text-muted-foreground"
            >
              API Key
            </label>
            <Input
              id="openai-key"
              type="password"
              value={openaiSettings.apiKey || ""}
              onChange={(e) =>
                updateSettings({
                  api: {
                    openai: {
                      ...openaiSettings,
                      apiKey: e.target.value,
                    },
                  },
                })
              }
              placeholder="sk-..."
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="openai-model"
              className="text-sm text-muted-foreground"
            >
              Model
            </label>
            <Select
              value={openaiSettings.selectedModel || openaiSettings.models[0]}
              onValueChange={(value) =>
                updateSettings({
                  api: {
                    openai: {
                      ...openaiSettings,
                      selectedModel: value,
                    },
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {openaiSettings.models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
