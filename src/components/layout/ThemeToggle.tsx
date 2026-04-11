import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export const ThemeToggle = ({ isCollapsed = false }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))] flex-shrink-0"
        >
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={isCollapsed ? "right" : "top"}>
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </TooltipContent>
    </Tooltip>
  );
};
