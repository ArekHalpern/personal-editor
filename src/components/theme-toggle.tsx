import { useTheme } from "./theme-provider";
import { cn } from "../lib/utils/cn";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex">
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "w-4 h-4 transition-all",
          "bg-white border border-border",
          theme === "light" ? "ring-1 ring-primary/50" : ""
        )}
        aria-label="Light theme"
      />
      <button
        onClick={() => setTheme("dawn")}
        className={cn(
          "w-4 h-4 transition-all -ml-[1px]",
          "bg-[hsl(150,60%,85%)] border border-border",
          theme === "dawn" ? "ring-1 ring-primary/50" : ""
        )}
        aria-label="Dawn theme"
      />
      <button
        onClick={() => setTheme("dusk")}
        className={cn(
          "w-4 h-4 transition-all -ml-[1px]",
          "bg-[hsl(263,50%,45%)] border border-border",
          theme === "dusk" ? "ring-1 ring-primary/50" : ""
        )}
        aria-label="Dusk theme"
      />
      <button
        onClick={() => setTheme("ocean")}
        className={cn(
          "w-4 h-4 transition-all -ml-[1px]",
          "bg-[hsl(215,70%,35%)] border border-border",
          theme === "ocean" ? "ring-1 ring-primary/50" : ""
        )}
        aria-label="Ocean theme"
      />
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "w-4 h-4 transition-all -ml-[1px]",
          "bg-zinc-950 border border-border",
          theme === "dark" ? "ring-1 ring-primary/50" : ""
        )}
        aria-label="Dark theme"
      />
    </div>
  );
}
