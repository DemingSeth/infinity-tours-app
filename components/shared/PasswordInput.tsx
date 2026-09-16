"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// A password field with a show/hide eye on the right (September 2026, Linda):
// a mistyped password is otherwise invisible until the sign in fails, which is
// the slowest possible way to find a typo. The eye is a plain button rather
// than a form control, so it never submits, and the field goes back to hidden
// whenever the page is left.
//
// Everything except `style` is forwarded to the input, so each screen keeps its
// own placeholder, minLength, required and autoComplete exactly as before.
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "style"> & {
  // The page's own input style. The right padding is widened here so text can
  // never run underneath the eye.
  style?: React.CSSProperties;
};

export default function PasswordInput({ style, ...inputProps }: Props) {
  const [show, setShow] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
      <input
        {...inputProps}
        type={show ? "text" : "password"}
        style={{ ...style, paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute", right: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 34, padding: 0,
          background: "none", border: "none", borderRadius: 7,
          cursor: "pointer", color: hover ? "var(--text-2)" : "var(--muted-2)",
          transition: "color .12s",
        }}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
