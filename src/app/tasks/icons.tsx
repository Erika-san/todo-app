// 一覧と詳細パネルで使うアイコン(references のデザインと同じ線の形)
import type { ReactNode } from "react";

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

// ----- ステップ6: サイドバー・リスト -----

function LineIcon({ size, className, children, strokeWidth = 1.75 }: IconProps & { size: number; children: ReactNode; strokeWidth?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function SunIcon({ size = 18, className }: IconProps) {
  return (
    <LineIcon size={size} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </LineIcon>
  );
}

export function InboxIcon({ size = 18, className }: IconProps) {
  return (
    <LineIcon size={size} className={className}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
    </LineIcon>
  );
}

export function FolderIcon({ size = 18, className }: IconProps) {
  return (
    <LineIcon size={size} className={className}>
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </LineIcon>
  );
}

export function PlusIcon({ size = 18, className }: IconProps) {
  return (
    <LineIcon size={size} className={className} strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </LineIcon>
  );
}

export function MenuIcon({ size = 22, className }: IconProps) {
  return (
    <LineIcon size={size} className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </LineIcon>
  );
}

export function DotsIcon({ size = 18, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

export function PencilIcon({ size = 16, className }: IconProps) {
  return (
    <LineIcon size={size} className={className}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </LineIcon>
  );
}

export function ChevronDownIcon({ size = 14, className }: IconProps) {
  return (
    <LineIcon size={size} className={className} strokeWidth={2}>
      <path d="M6 9l6 6 6-6" />
    </LineIcon>
  );
}
