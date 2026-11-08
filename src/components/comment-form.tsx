"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment, type CommentState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";

export function CommentForm({
  productId,
  userName,
  makerFirstName,
}: {
  productId: string;
  userName: string;
  /** Used in the placeholder: "Ask Maya a question…". */
  makerFirstName?: string;
}) {
  const [state, formAction, pending] = useActionState<CommentState, FormData>(
    addComment.bind(null, productId),
    { status: "idle" },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "posted") {
      formRef.current?.reset();
      track("comment_posted", { product_id: productId });
    }
  }, [state, productId]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-2.5">
      <label htmlFor="comment-body" className="text-[13px] text-muted-foreground">
        Commenting as <span className="font-medium text-foreground">{userName}</span>
      </label>
      <Textarea
        id="comment-body"
        name="body"
        rows={3}
        maxLength={1000}
        required
        placeholder={makerFirstName ? `Ask ${makerFirstName} a question or share what you think` : "Ask the maker a question or share what you think"}
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? "comment-error" : undefined}
        className="min-h-24 resize-y bg-card"
      />
      {state.status === "error" && (
        <p id="comment-error" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Posting…" : "Post comment"}
      </Button>
    </form>
  );
}
