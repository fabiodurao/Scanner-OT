import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  isCollapsed?: boolean;
  isMobile?: boolean;
}

export const ThemeToggle = ({ isCollapsed = false, isMobile = false }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  if (!isMobile && isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-center text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))] p-2"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "w-full justify-start text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))] gap-2",
      )}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          Light Mode
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          Dark Mode
        </>
      )}
    </Button>
  );
};