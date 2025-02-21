"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import PropTypes from "prop-types"; // Import PropTypes
import { cn } from "@/lib/utils";

const Progress = React.forwardRef(
  ({ className, value, extraStyles, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={`h-full w-full flex-1 bg-primary transition-all ${extraStyles}`}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;

// Add PropTypes validation
Progress.propTypes = {
  className: PropTypes.string, // Validate className
  value: PropTypes.number, // Validate value
  extraStyles: PropTypes.string, // Validate extraStyles
};

export { Progress };
