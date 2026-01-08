import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  dark?: boolean;
}

export const Logo = ({ variant = 'full', className, dark = false }: LogoProps) => {
  const textColor = dark ? 'text-white' : 'text-[#1a2744]';
  const accentColor = 'text-[#2563EB]';

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* CFP Icon - Stylized energy/power symbol */}
          <rect width="40" height="40" rx="8" fill="#2563EB" />
          <path
            d="M20 8L12 22H18L16 32L28 18H22L24 8H20Z"
            fill="white"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10"
      >
        <rect width="40" height="40" rx="8" fill="#2563EB" />
        <path
          d="M20 8L12 22H18L16 32L28 18H22L24 8H20Z"
          fill="white"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col">
        <span className={cn('text-xl font-bold leading-tight', dark ? 'text-white' : 'text-[#1a2744]')}>
          Cyber<span className={accentColor}>Energia</span>
        </span>
        <span className={cn('text-xs font-medium tracking-wider', dark ? 'text-gray-400' : 'text-gray-500')}>
          MIDDLEWARE OT
        </span>
      </div>
    </div>
  );
};