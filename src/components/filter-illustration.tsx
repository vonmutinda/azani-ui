import { useId } from "react";
import { ClothingIllustration } from "@/components/clothing-illustration";

/** Enamel-style section illustrations, decorative beside a written label. */
export function FilterIllustration({ name }: { name: "age" | "size" | "gender" }) {
  const id = useId().replace(/:/g, "");
  if (name === "size") return <ClothingIllustration name="age" size={38} />;
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient
          id={`${id}-pink`}
          x1="15"
          y1="18"
          x2="45"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffacc6" />
          <stop offset="1" stopColor="#ec4781" />
        </linearGradient>
        <linearGradient
          id={`${id}-blue`}
          x1="32"
          y1="12"
          x2="55"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#70d9f4" />
          <stop offset="1" stopColor="#1286c5" />
        </linearGradient>
        <linearGradient
          id={`${id}-gold`}
          x1="16"
          y1="20"
          x2="48"
          y2="57"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffe6a0" />
          <stop offset="1" stopColor="#e4ad47" />
        </linearGradient>
      </defs>
      <g stroke="#293e54" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        {name === "age" ? (
          <>
            <path d="M12 32h40v19a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V32Z" fill={`url(#${id}-pink)`} />
            <path
              d="M12 35c4 0 4 7 8 7s4-7 8-7 4 7 8 7 4-7 8-7 4 7 8 7v-8a5 5 0 0 0-5-5H17a5 5 0 0 0-5 5Z"
              fill="#fff5d4"
            />
            <path d="M9 57h46" stroke="#dba743" strokeWidth="4" />
            <path d="M27 29V18h10v11" fill={`url(#${id}-blue)`} />
            <path d="M32 6c-6 6-6 10 0 10 6 0 6-4 0-10Z" fill="#ffce4d" />
            <path d="m20 48 1 1m12 0 1 1m11-2 1 1" stroke="#ffdc76" />
            <path d="M16 46v5" stroke="white" strokeWidth="2" opacity=".7" />
          </>
        ) : (
          <>
            <path d="M5 55c0-12 5-19 15-19s15 7 15 19" fill={`url(#${id}-pink)`} />
            <path d="M29 55c0-12 5-19 15-19s15 7 15 19" fill={`url(#${id}-blue)`} />
            <path d="M8 25c-1-13 6-18 13-18 11 0 16 12 12 25H8v-7Z" fill="#3b2d31" />
            <ellipse cx="21" cy="25" rx="10" ry="12" fill={`url(#${id}-gold)`} />
            <path d="M10 21c7-1 9-6 10-10 1 6 5 9 11 10" fill="#4c3031" />
            <ellipse cx="44" cy="26" rx="10" ry="12" fill={`url(#${id}-gold)`} />
            <path d="M33 22c-2-12 13-18 22-8l-2 8-7-7-13 7Z" fill="#44322e" />
            <path d="M17 25h.1m8 0h.1m15 1h.1m8 0h.1" strokeWidth="3" />
            <path d="M18 31q3 3 6 0m17 1q3 3 6 0" strokeWidth="1.8" />
            <path d="m6 13 5-3 3 4-3 4-5-5Z" fill="#ff92b8" />
            <path d="M9 50v3m25-4v4" stroke="white" strokeWidth="2" opacity=".7" />
          </>
        )}
      </g>
    </svg>
  );
}
