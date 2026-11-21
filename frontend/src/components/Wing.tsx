interface Props {
  brightness: number; // 0..1, dims the wing at dusk and night
}

// Wing and winglet seen from a window seat. Coordinates are percentages of the pane.
export default function Wing({ brightness }: Props) {
  return (
    <svg
      className="absolute top-0 right-0 h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        aspectRatio: "0.64",
        overflow: "visible",
        filter: `brightness(${0.25 + 0.75 * brightness})`,
      }}
    >
      <defs>
        <linearGradient id="wingTop" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#f2eef6" />
          <stop offset="1" stopColor="#b9b6cc" />
        </linearGradient>
        <linearGradient id="wingTip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b4f9a" />
          <stop offset="1" stopColor="#6b7bb8" />
        </linearGradient>
      </defs>
      {/* Main wing surface */}
      <path
        d="M 46 38 L 52 46 L 64 52 L 88 58 L 112 62 L 112 78 L 96 76 L 74 73 L 74 70 L 88 68 L 66 60 L 54 55 L 47 47 Z"
        fill="url(#wingTop)"
      />
      {/* Winglet */}
      <path d="M 41 29 L 47 31 L 52 44 L 49 48 L 45 44 Z" fill="url(#wingTip)" />
      {/* Flap line */}
      <path d="M 74 70 L 96 73" stroke="#8d8aa3" strokeWidth="0.4" fill="none" />
    </svg>
  );
}