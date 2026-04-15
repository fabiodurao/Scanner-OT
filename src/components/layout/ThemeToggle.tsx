import { useTheme } from '@/contexts/ThemeContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export const ThemeToggle = ({ isCollapsed = false }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={toggleTheme}
            className="relative h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          onClick={toggleTheme}
          className="relative flex items-center h-7 w-[52px] rounded-full bg-[hsl(var(--sidebar-accent))] p-0.5 transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {/* Sun icon - left side */}
          <Sun className={`absolute left-1.5 h-3 w-3 transition-opacity ${isDark ? 'opacity-40 text-gray-400' : 'opacity-100 text-amber-400'}`} />
          {/* Moon icon - right side */}
          <Moon className={`absolute right-1.5 h-3 w-3 transition-opacity ${isDark ? 'opacity-100 text-blue-300' : 'opacity-40 text-gray-400'}`} />
          {/* Sliding knob */}
          <span
            className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isDark ? 'translate-x-[26px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </TooltipContent>
    </Tooltip>
  );
};
