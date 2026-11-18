// 一覧と詳細パネルで使うアイコン(references のデザインと同じ線の形)

type IconProps = { size?: number; className?: string };

export function CalendarIcon({ size = 13, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function MemoIcon({ size = 13, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

// 優先度「高」の旗。label を渡すと読み上げ用の名前が付く
export function FlagIcon({ size = 16, className, label }: IconProps & { label?: string }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" {...a11y}>
      <path d="M4 22V4M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}

export function AlertIcon({ size = 14, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </svg>
  );
}

export function CheckIcon({ size = 14, className, strokeWidth = 2.5 }: IconProps & { strokeWidth?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function BackIcon({ size = 22, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
