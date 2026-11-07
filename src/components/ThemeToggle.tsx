import { Moon, Sun } from 'lucide-react';
import IconButton from './ui/IconButton';
import { Theme } from '../lib/theme';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  const next = theme === 'studio' ? 'warm paper' : 'dark studio';
  return (
    <IconButton
      label={`Switch to ${next} theme`}
      onClick={onToggle}
      aria-pressed={theme === 'studio'}
      className="border border-app-border bg-app-raised"
    >
      {theme === 'studio' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </IconButton>
  );
}
