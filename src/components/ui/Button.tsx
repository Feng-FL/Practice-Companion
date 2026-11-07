import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-app-accent text-app-on-accent hover:bg-app-accent-hover border border-transparent',
  secondary:
    'bg-app-raised text-app-text border border-app-border hover:border-app-accent hover:bg-app-accent-soft',
  ghost:
    'bg-transparent text-app-muted border border-transparent hover:text-app-text hover:bg-app-sunken',
  danger:
    'bg-app-danger-soft text-app-danger border border-app-danger/35 hover:bg-app-danger hover:text-app-on-accent',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[11px]',
  md: 'h-10 px-4 text-xs',
};

/**
 * Props are declared explicitly rather than extending React's button
 * attribute types: this project does not ship @types/react, so an
 * `extends React.ButtonHTMLAttributes<...>` base would silently collapse to
 * an empty interface.
 */
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Uppercase tracked label, matching the app's existing micro-type style. */
  tracked?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  children?: React.ReactNode;
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  tracked = true,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
        'disabled:opacity-45 disabled:pointer-events-none',
        tracked ? 'uppercase tracking-[0.14em]' : '',
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
