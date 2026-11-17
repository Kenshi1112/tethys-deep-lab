// Generic blue butterfly icon (own drawing, not game art).
export default function Butterfly({ size = 28, id = "bf" }: { size?: number; id?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B3E5FC" />
          <stop offset="1" stopColor="#1E88E5" />
        </linearGradient>
      </defs>
      <path d="M31 30C26 12 8 8 6 18c-2 10 8 16 25 16Z" fill={`url(#${id})`} />
      <path d="M33 30C38 12 56 8 58 18c2 10-8 16-25 16Z" fill={`url(#${id})`} />
      <path d="M31 36C22 38 12 46 16 54c4 4 12-4 15-12Z" fill={`url(#${id})`} opacity="0.85" />
      <path d="M33 36C42 38 52 46 48 54c-4 4-12-4-15-12Z" fill={`url(#${id})`} opacity="0.85" />
      <path d="M32 24v26" stroke="#E1F5FE" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 24c-2-6-5-9-7-10M32 24c2-6 5-9 7-10" stroke="#E1F5FE" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
