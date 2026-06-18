"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Lightweight shadcn-style primitives (no Radix dependency). Tailwind-only.
// ============================================================================

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const variants: Record<string, string> = {
    default:
      "bg-gradient-to-r from-[#b15cff] to-[#ff4d8d] text-white shadow-[0_6px_22px_-8px_rgba(177,92,255,0.8)] hover:brightness-110 disabled:opacity-50",
    ghost: "bg-transparent text-muted hover:bg-white/5 hover:text-fg",
    outline: "border border-border-strong bg-white/5 text-fg hover:bg-white/10",
    danger: "bg-fail/90 text-white hover:bg-fail",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-11 px-6 text-sm",
    icon: "h-9 w-9",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass rounded-2xl", className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 px-4 pt-3 pb-2", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold tracking-tight text-fg", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className,
      )}
      {...props}
    />
  );
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-y rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-fg placeholder:text-faint outline-none transition-colors focus:border-brand/60 focus:ring-1 focus:ring-brand/40",
        className,
      )}
      {...props}
    />
  );
});

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-border bg-panel-2 px-3 text-sm text-fg placeholder:text-faint outline-none transition-colors focus:border-brand/60 focus:ring-1 focus:ring-brand/40",
        className,
      )}
      {...props}
    />
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[11px] font-medium uppercase tracking-wide text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-lg border border-border bg-panel-2 px-2 text-sm text-fg outline-none transition-colors focus:border-brand/60",
        className,
      )}
      {...props}
    />
  );
}

export function Mono({
  className,
  ...props
}: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className={cn(
        "whitespace-pre-wrap break-words rounded-lg border border-border bg-black/45 px-3 py-2 font-mono text-xs leading-relaxed text-fg/90",
        className,
      )}
      {...props}
    />
  );
}
