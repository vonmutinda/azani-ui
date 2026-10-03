import { useId } from "react";

export type EnamelUtilityName = "search" | "account" | "wishlist" | "cart" | "wallet" | "stock";

/** Decorative enamel artwork; the enclosing button or heading supplies its label. */
export function EnamelUtilityIcon({
  name,
  size = 32,
  className = "",
}: {
  name: EnamelUtilityName;
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const paint = (colour: string) => `url(#${id}-${colour})`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient
          id={`${id}-pink`}
          x1="15"
          y1="10"
          x2="49"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffb9cf" />
          <stop offset=".5" stopColor="#f570a1" />
          <stop offset="1" stopColor="#ce326c" />
        </linearGradient>
        <linearGradient
          id={`${id}-mint`}
          x1="10"
          y1="8"
          x2="54"
          y2="57"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b5edcf" />
          <stop offset=".48" stopColor="#69cea9" />
          <stop offset="1" stopColor="#319982" />
        </linearGradient>
        <linearGradient
          id={`${id}-blue`}
          x1="12"
          y1="12"
          x2="48"
          y2="49"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b8eef8" />
          <stop offset=".5" stopColor="#61cbe9" />
          <stop offset="1" stopColor="#2588c0" />
        </linearGradient>
        <linearGradient
          id={`${id}-gold`}
          x1="8"
          y1="8"
          x2="55"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff1b3" />
          <stop offset=".45" stopColor="#f1c962" />
          <stop offset="1" stopColor="#ba8236" />
        </linearGradient>
        <linearGradient
          id={`${id}-cream`}
          x1="22"
          y1="17"
          x2="41"
          y2="39"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffe8be" />
          <stop offset="1" stopColor="#dea06b" />
        </linearGradient>
      </defs>
      <g stroke="#293e54" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {name === "search" && (
          <>
            <path d="m39 39 17 17a4 4 0 0 0 0-6L43 36" fill={paint("gold")} />
            <path d="m43 44 4-4" stroke="#bb8a41" />
            <circle cx="26" cy="26" r="20" fill={paint("gold")} />
            <circle cx="26" cy="26" r="15.5" fill={paint("blue")} strokeWidth="1.8" />
            <path d="M16 24a11 11 0 0 1 9-9" stroke="white" strokeWidth="3" opacity=".85" />
            <path d="m35 31-4 4" stroke="#d5f6ff" strokeWidth="2" />
            <path d="m48 48 6 6" stroke="#fff4c4" strokeWidth="1.6" />
          </>
        )}
        {name === "account" && (
          <>
            <circle cx="32" cy="32" r="27" fill={paint("gold")} />
            <circle cx="32" cy="32" r="23" fill={paint("mint")} strokeWidth="1.6" />
            <path d="M16 49c1-10 7-16 16-16s15 6 16 16a23 23 0 0 1-32 0Z" fill={paint("blue")} />
            <path d="M25 38q7 7 14 0" fill="#fff5dc" />
            <circle cx="32" cy="25" r="10" fill={paint("cream")} />
            <path d="M22 24c-2-13 18-16 20-2-6 0-11-3-13-5-1 4-3 6-7 7Z" fill="#3f3438" />
            <path d="M28 26h.1m8 0h.1" strokeWidth="2.6" />
            <path d="M29 31q3 2 6 0" strokeWidth="1.4" />
            <path d="M13 25a20 20 0 0 1 8-10" stroke="white" strokeWidth="2" opacity=".8" />
            <path d="M21 44v4" stroke="#c5efff" strokeWidth="2" />
          </>
        )}
        {name === "wishlist" && (
          <>
            <path
              d="M32 57C25 51 6 36 6 22 6 5 26 3 32 16 38 3 58 5 58 22c0 14-19 29-26 35Z"
              fill={paint("gold")}
            />
            <path
              d="M32 51C24 44 11 33 11 23c0-13 15-15 21-2 6-13 21-11 21 2 0 10-13 21-21 28Z"
              fill={paint("pink")}
              strokeWidth="1.7"
            />
            <path d="M17 22c0-5 4-7 7-6" stroke="white" strokeWidth="3" opacity=".85" />
            <path d="m41 37-5 5" stroke="#ffc4d9" strokeWidth="2.2" />
          </>
        )}
        {name === "cart" && (
          <>
            <path d="M12 21h40l5 33a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4l5-33Z" fill={paint("gold")} />
            <path d="M16 25h32l4 28H12l4-28Z" fill={paint("mint")} strokeWidth="1.7" />
            <path d="M22 25V15a10 10 0 0 1 20 0v10" stroke="#293e54" strokeWidth="5.5" />
            <path d="M22 25V15a10 10 0 0 1 20 0v10" stroke="#f7d37c" strokeWidth="2.8" />
            <path
              d="M32 45c-3-2-8-6-8-10 0-5 6-6 8-2 2-4 8-3 8 2 0 4-5 8-8 10Z"
              fill={paint("pink")}
              strokeWidth="1.5"
            />
            <path d="m18 30-2 12" stroke="white" strokeWidth="2" opacity=".75" />
            <path d="M44 49h4" stroke="#bdf2d4" strokeWidth="1.8" />
          </>
        )}
        {name === "wallet" && (
          <>
            <path d="m13 17 33-7 5 22-35 7-3-22Z" fill={paint("mint")} />
            <path
              d="M8 22a6 6 0 0 1 6-6h35a5 5 0 0 1 5 5v31a5 5 0 0 1-5 5H14a6 6 0 0 1-6-6V22Z"
              fill={paint("gold")}
            />
            <path d="M12 24h38v28H15a3 3 0 0 1-3-3V24Z" fill={paint("pink")} strokeWidth="1.7" />
            <path d="M44 32h12v14H44a7 7 0 0 1 0-14Z" fill={paint("gold")} />
            <circle cx="47" cy="39" r="2" fill="#293e54" stroke="none" />
            <path d="M16 31v11" stroke="white" strokeWidth="2" opacity=".75" />
            <path d="M14 20h30" stroke="#fff1bb" strokeWidth="1.5" />
          </>
        )}
        {name === "stock" && (
          <>
            <path d="m8 19 23-11 25 11v29L32 58 8 48V19Z" fill={paint("gold")} />
            <path
              d="m12 25 20 9v19l-20-8V25Zm23 9 17-8v19l-17 8V34Z"
              fill={paint("mint")}
              strokeWidth="1.6"
            />
            <path d="m8 19 24 11 24-11M32 30v28" />
            <path d="m21 13 24 11v10l-10 4V28L11 18" fill="#ffedbc" strokeWidth="1.5" />
            <circle cx="47" cy="46" r="12" fill={paint("mint")} />
            <path d="m41 46 4 4 8-9" stroke="white" strokeWidth="3" />
            <path d="M16 32v8" stroke="white" strokeWidth="2" opacity=".7" />
          </>
        )}
      </g>
    </svg>
  );
}
