"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment, type CommentState } from "@/app/actions";

export function CommentForm({ productId, userName }: { productId: string; userName: string }) {
  const [state, formAction, pending] = useActionState<CommentState, FormData>(
    addComment.bind(null, productId),
    { status: "idle" },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "posted") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      <label htmlFor="comment-body" className="text-sm text-mist">
        Commenting as <span className="font-semibold text-ink">{userName}</span>
      </label>
      <textarea
        id="comment-body"
        name="body"
        rows={3}
        maxLength={1000}
        required
        placeholder="Ask the maker a question or share what you think"
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? "comment-error" : undefined}
        className="w-full resize-y rounded-xl border-2 border-line bg-paper px-3.5 py-3 text-ink placeholder:text-mist focus:border-ink focus:outline-none"
      />
      {state.status === "error" && (
        <p id="comment-error" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="press h-11 justify-self-start rounded-xl border-2 border-on-signal bg-on-signal px-5 font-bold text-signal shadow-[3px_3px_0_0_var(--pop)] disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}
