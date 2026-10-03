type Props = { name: string; className?: string; style?: React.CSSProperties };

/** Garment outlines share the navigation's 24px grid and 1.5px stroke. */
export function GarmentIcon({ name, ...props }: Props) {
  const shapes: Record<string, React.ReactNode> = {
    dress: (
      <>
        <path d="m8 3-2 4 4 3-5 10h14l-5-10 4-3-2-4-4 2-4-2Z" />
        <path d="M10 10h4M8 16h8" />
      </>
    ),
    trousers: (
      <>
        <path d="M6 3h12l1 18h-6l-1-11-1 11H5L6 3Z" />
        <path d="M6 6h12M12 3v4" />
      </>
    ),
    jacket: (
      <>
        <path d="m9 3-4 3-3 8 4 2 2-5v10h8V11l2 5 4-2-3-8-4-3" />
        <path d="m9 3 3 4 3-4M12 7v14M8 15h2m4 0h2" />
      </>
    ),
    outfit: (
      <>
        <path d="m6 3-4 2 2 5 2-1v6h10V9l2 1 2-5-4-2a5 5 0 0 1-10 0Z" />
        <path d="M7 17v4h4v-4m2 0v4h4v-4" />
      </>
    ),
    socks: (
      <>
        <path d="M9 3h8v10l-6 7a4 4 0 0 1-6-5l4-4V3Z" />
        <path d="M9 6h8M14 17l-5-4" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {shapes[name]}
    </svg>
  );
}
