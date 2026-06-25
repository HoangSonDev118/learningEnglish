import { cn } from "@/lib/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-violet-600 text-white shadow-sm hover:bg-violet-700 active:scale-95",
        destructive:
          "bg-red-500 text-white shadow-sm hover:bg-red-600 active:scale-95",
        outline:
          "border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 active:scale-95",
        secondary:
          "bg-zinc-100 text-zinc-900 shadow-sm hover:bg-zinc-200 active:scale-95",
        ghost:
          "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95",
        link: "text-violet-600 underline-offset-4 hover:underline p-0 h-auto",
        again:
          "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 active:scale-95",
        hard:
          "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 active:scale-95",
        good:
          "bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 active:scale-95",
        easy:
          "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 active:scale-95",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
