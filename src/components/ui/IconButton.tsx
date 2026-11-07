import React from 'react';

export interface IconButtonProps {
  /** Used for the accessible name and the tooltip. */
  label: string;
  tone?: 'default' | 'accent' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  children?: React.ReactNode;
}

const TONE = {
  default: 'text-app-muted hover:text-app-text hover:bg-app-sunken',
  accent: 'text-app-accent hover:bg-app-accent-soft',
  danger: 'text-app-muted hover:text-app-danger hover:bg-app-danger-soft',
};

export default function IconButton({
  label,
  tone = 'default',
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
        'transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
        'disabled:opacity-40 disabled:pointer-events-none',
        TONE[tone],
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
