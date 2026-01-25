import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ActiveJobsIndicator } from './ActiveJobsIndicator';
import { ActiveUploadsIndicator } from './ActiveUploadsIndicator';
import { ActiveAnalysisIndicator } from './ActiveAnalysisIndicator';
import { ActivePhotoJobsIndicator } from './ActivePhotoJobsIndicator';
import {
  LayoutDashboard,
  Upload,
  Settings,
  Users,
  LogOut,
  Building2,
  Cpu,
  FileArchive,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const Sidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isPcapActive = location.pathname === '/upload' || location.pathname === '/processing';
  
  const [pcapOpen, setPcapOpen] = useState(isPcapActive);
  
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const mainNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sites Management', href: '/sites-management', icon: Building2 },
  ];

  const pcapNavigation = [
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Processing', href: '/processing', icon: Cpu },
  ];

  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (profile?.is_admin) {
    bottomNavigation.push({ name: 'Users', href: '/users', icon: Users });
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    
    if (href === '/sites-management') {
      return location.pathname === '/sites-management' || 
             location.pathname.startsWith('/sites-management/');
    }
    
    return location.pathname.startsWith(href);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const NavLink = ({ item, isMobile = false }: { item: { name: string; href: string; icon: React.ElementType }; isMobile?: boolean }) => {
    const active = isActive(item.href);
    
    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
          active
            ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
            : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white',
          !isMobile && isCollapsed && 'justify-center px-2'
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {(isMobile || !isCollapsed) && (
          <span className="truncate flex-1">{item.name}</span>
        )}
      </Link>
    );

    if (!isMobile && isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className={cn(
        "flex h-16 items-center border-b border-[hsl(var(--sidebar-border))]",
        !isMobile && isCollapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {(isMobile || !isCollapsed) && (
          <img 
            src="/logo-white.png" 
            alt="Cyber Energia" 
            className="h-8 w-auto object-contain"
          />
        )}
        {!isMobile && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCollapse}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))]"
              >
                {isCollapsed ? (
                  <PanelLeft className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {mainNavigation.map((item) => (
          <NavLink key={item.name} item={item} isMobile={isMobile} />
        ))}

        {!isMobile && isCollapsed ? (
          <>
            {pcapNavigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
                          : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </>
        ) : (
          <Collapsible open={pcapOpen} onOpenChange={setPcapOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full',
                  isPcapActive
                    ? 'text-white'
                    : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'
                )}
              >
                {pcapOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <FileArchive className="h-5 w-5" />
                <span className="flex-1 text-left">PCAP</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 ml-2 mr-1 rounded-lg bg-[hsl(220,50%,18%)] border border-[hsl(220,50%,22%)] p-2 space-y-1">
                {pcapNavigation.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
                          : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(220,50%,24%)] hover:text-white'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="pt-4">
          <Separator className="bg-[hsl(var(--sidebar-border))] mb-4" />
          {bottomNavigation.map((item) => (
            <NavLink key={item.name} item={item} isMobile={isMobile} />
          ))}
        </div>
      </nav>
      
      {(isMobile || !isCollapsed) && <ActivePhotoJobsIndicator />}
      {(isMobile || !isCollapsed) && <ActiveAnalysisIndicator />}
      {(isMobile || !isCollapsed) && <ActiveUploadsIndicator />}
      {(isMobile || !isCollapsed) && <ActiveJobsIndicator />}
      
      <div className={cn(
        "border-t border-[hsl(var(--sidebar-border))] p-4",
        !isMobile && isCollapsed && "p-2"
      )}>
        {profile && (isMobile || !isCollapsed) && (
          <div className="mb-3">
            <div className="text-sm font-medium text-white truncate">
              {profile.full_name}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {profile.email}
            </div>
          </div>
        )}
        {(isMobile || !isCollapsed) && <Separator className="bg-[hsl(var(--sidebar-border))] mb-3" />}
        
        {!isMobile && isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="w-full justify-center text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))] p-2"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        )}
        
        {(isMobile || !isCollapsed) && (
          <div className="text-xs text-gray-500 mt-3">
            OT Scanner v0.4
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 bg-white shadow-lg"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-[hsl(var(--sidebar-background))]">
            <SidebarContent isMobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <div 
        className={cn(
          "hidden md:flex h-full flex-col bg-[hsl(var(--sidebar-background))] transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent isMobile={false} />
      </div>
    </>
  );
};

export { Sidebar };