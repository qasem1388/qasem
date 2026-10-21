"use client";

/** Last-resort fallback when a root layout fails; renders its own document without app styles. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f6f7f9",
          color: "#0b1f3a",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <title>خطأ | Error</title>
        <main>
          <h1 style={{ fontSize: "1.5rem" }}>حدث خطأ غير متوقع</h1>
          <p lang="en" dir="ltr" style={{ color: "#5b6576" }}>
            Something went wrong. Please try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "1rem",
              padding: "0.6rem 1.4rem",
              border: 0,
              borderRadius: 8,
              background: "#0b1f3a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            إعادة المحاولة · Try again
          </button>
        </main>
      </body>
    </html>
  );
}
