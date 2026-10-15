"use client";

import { useState } from "react";
import { StarIcon } from "../icons";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, name: fd.get("name"), city: fd.get("city"), comment: fd.get("comment") }),
    });
    if (res.ok) setState("done");
    else {
      setError((await res.json().catch(() => ({}))).error || "حدث خطأ");
      setState("error");
    }
  };

  if (state === "done") return <p className="rounded-2xl bg-brand-50 p-5 text-brand-800">شكراً لك! سيظهر تقييمك بعد المراجعة.</p>;
  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <p className="font-extrabold">أضف تقييمك</p>
      <div className="flex gap-1 text-gold-500" dir="ltr">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} onClick={() => setRating(i)} aria-label={`${i} نجوم`}>
            <StarIcon className="h-7 w-7" filled={rating >= i} />
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required maxLength={40} className="input" placeholder="الاسم" />
        <input name="city" maxLength={30} className="input" placeholder="المدينة (اختياري)" />
      </div>
      <textarea name="comment" required minLength={5} maxLength={600} rows={3} className="input" placeholder="شاركنا تجربتك مع المنتج" />
      {state === "error" && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={state === "loading"}>إرسال التقييم</button>
    </form>
  );
}
