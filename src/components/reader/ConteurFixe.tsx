// Repli 2D : sans WebGL, ou quand la personne a demandé moins d'animations. Même personnage, immobile,
// avec seulement la bouche qui s'ouvre pendant la lecture.
export default function ConteurFixe({ parle }: { parle: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 400"
      className="pointer-events-none absolute bottom-[52%] left-1/2 h-[26%] -translate-x-1/2 lg:bottom-[34%] lg:left-auto lg:right-[12%] lg:h-[40%] lg:translate-x-0"
    >
      <circle cx="150" cy="150" r="118" fill="var(--ocre-300)" opacity=".18" />
      <path
        d="M30 400 C30 300 85 250 150 250 C215 250 270 300 270 400Z"
        fill="var(--indigo-700)"
      />
      <path d="M70 330 L230 290 L230 312 L70 352Z" fill="var(--ocre-500)" />
      <rect x="132" y="215" width="36" height="42" rx="12" fill="var(--terre-600)" />
      <ellipse cx="150" cy="165" rx="62" ry="68" fill="var(--terre-600)" />
      <path
        d="M86 150 C86 90 214 90 214 150 C190 128 110 128 86 150Z"
        fill="var(--laterite-500)"
      />
      <path
        d="M88 142 C120 128 180 128 212 142"
        fill="none"
        stroke="var(--ocre-300)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="126" cy="172" r="9" fill="var(--terre-50)" />
      <circle cx="174" cy="172" r="9" fill="var(--terre-50)" />
      <circle cx="126" cy="173" r="4.5" fill="var(--terre-900)" />
      <circle cx="174" cy="173" r="4.5" fill="var(--terre-900)" />
      <ellipse
        cx="150"
        cy="208"
        rx="14"
        ry="4"
        fill="var(--laterite-900)"
        className={parle ? 'bouche-parle' : ''}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </svg>
  )
}
