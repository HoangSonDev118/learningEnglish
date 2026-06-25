import { cn } from "@/lib/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[1.35rem] border border-transparent font-semibold tracking-[0.01em] select-none cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-[transform,background-color,color,border-color] duration-150 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none",
  {
    variants: {
      variant: {
        default:
          "border-violet-600 border-b-[5px] border-b-violet-700 bg-violet-500 text-white hover:border-violet-500 hover:border-b-violet-700 hover:bg-violet-400 active:translate-y-[2px] active:border-b-[2px] active:bg-violet-500",
        destructive:
          "bg-red-600 border-red-700 text-white hover:bg-red-500 hover:border-red-600 active:bg-red-700",
        outline:
          "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100",
        secondary:
          "bg-zinc-100 border-zinc-200 text-zinc-900 hover:bg-zinc-200 hover:border-zinc-300 active:bg-zinc-300",
        ghost:
          "border-transparent text-zinc-700 shadow-none hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200",
        link: "h-auto border-transparent p-0 text-violet-600 shadow-none underline-offset-4 hover:underline active:translate-y-0",
        again:
          "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 active:bg-red-200",
        hard:
          "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300 active:bg-orange-200",
        good:
          "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 active:bg-blue-200",
        easy:
          "bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:border-green-300 active:bg-green-200",
      },
      size: {
        default: "h-11 px-5 py-2 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-[3.25rem] px-7 text-base",
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
