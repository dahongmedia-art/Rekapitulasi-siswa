"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function Button({
  className,
  children,
  variant = "primary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400",
        props.className
      )}
    />
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700", className)}>{children}</span>;
}
