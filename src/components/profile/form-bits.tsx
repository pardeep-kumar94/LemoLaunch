export const inputClass =
  "h-12 w-full rounded-[14px] border-2 border-line bg-paper px-3.5 text-ink placeholder:text-mist/70 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";

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
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-mist">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Green or red line under a form after it's submitted. */
export function FormStatus({ status, message }: { status: string; message?: string }) {
  if (!message || status === "idle") return null;
  return (
    <p
      role="status"
      className={`rounded-[12px] px-3.5 py-2.5 text-sm font-semibold ${
        status === "saved" ? "bg-[#e3f5ea] text-[#1d6b3d]" : "bg-pop-wash text-danger"
      }`}
    >
      {message}
    </p>
  );
}

export const saveButtonClass =
  "press h-12 justify-self-start rounded-xl border-2 border-on-signal bg-signal px-6 font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)] disabled:opacity-60";
