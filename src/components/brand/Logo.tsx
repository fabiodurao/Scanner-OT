import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'standard' | 'white';
  className?: string;
  showSubtitle?: boolean;
}

export const Logo = ({ variant = 'standard', className, showSubtitle = true }: LogoProps) => {
  const logoSrc = variant === 'white' 
    ? '/logo-white.png' 
    : '/logo-standard.png';

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <img
        src={logoSrc}
        alt="Centrii"
        className="h-10 w-auto object-contain"
      />
      {showSubtitle && (
        <span className={cn(
          'text-xs font-medium tracking-wider mt-1',
          variant === 'white' ? 'text-gray-400' : 'text-gray-500'
        )}>
          MIDDLEWARE OT
        </span>
      )}
    </div>
  );
};