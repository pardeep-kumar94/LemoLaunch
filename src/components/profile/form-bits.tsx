import { CircleAlert, CircleCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Classes for a plain <input> that matches the shadcn Input, a little taller for forms. */
export const inputClass =
  "h-10 w-full min-w-0 rounded-[10px] border border-input bg-card px-3 text-[15px] shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Saved or failed line under a form after it's submitted. */
export function FormStatus({ status, message }: { status: string; message?: string }) {
  if (!message || status === "idle") return null;
  const saved = status === "saved";
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium",
        saved ? "bg-[color-mix(in_oklab,var(--leaf)_12%,var(--card))] text-leaf" : "bg-destructive/10 text-destructive",
      )}
    >
      {saved ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
      {message}
    </p>
  );
}

export const saveButtonClass = cn(buttonVariants({ size: "lg" }), "justify-self-start");
