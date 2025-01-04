import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../lib/utils/cn";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center group",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-6 w-full grow border border-primary/20 bg-muted/50">
      <SliderPrimitive.Range className="absolute h-full bg-primary/10 group-hover:bg-primary/20 group-focus-within:bg-primary/20 transition-colors" />
      <SliderPrimitive.Thumb
        className={cn(
          "absolute top-0 block h-full w-1",
          "bg-primary transition-colors",
          "hover:bg-primary/90 focus:bg-primary/90",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:pointer-events-none disabled:opacity-50",
          "data-[state=dragging]:bg-primary/90"
        )}
      />
    </SliderPrimitive.Track>
  </SliderPrimitive.Root>
));

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
