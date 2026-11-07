import React from 'react';

export interface ChipProps {
  active?: boolean;
  tone?: 'accent' | 'neutral';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  /** React's list key. Declared here because @types/react is not installed. */
  key?: string | number;
}

/** Compact pill used for the musical-key filter and for a piece's key tags. */
export default function Chip({
  active = false,
  tone = 'accent',
  className = '',
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2',
        'text-[11px] font-semibold leading-none',
        'transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus-visible:ring-offset-app-surface',
        active
          ? tone === 'accent'
            ? 'bg-app-accent text-app-on-accent'
            : 'bg-app-text text-app-bg'
          : 'bg-app-sunken text-app-muted hover:text-app-text',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
