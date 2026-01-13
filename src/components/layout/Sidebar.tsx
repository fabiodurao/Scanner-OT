import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ActiveJobsIndicator } from './ActiveJobsIndicator';
import {
  LayoutDashboard,
  Server,
  Table,
  Upload,
  Settings,
  Users,
  LogOut,
  Building2,
  Cpu,
  FileArchive,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const Sidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  
  // Check if any PCAP route is active to auto-expand
  const isPcapActive = location.pathname === '/upload' || location.pathname === '/processing';
  const [pcapOpen, setPcapOpen] = useState(isPcapActive);

  const mainNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sites Management', href: '/sites-management', icon: Building2 },
    { name: 'Sites', href: '/sites', icon: Server },
    { name: 'Variables', href: '/variables', icon: Table },
  ];

  const pcapNavigation = [
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Processing', href: '/processing', icon: Cpu },
  ];

  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Add user management for admins
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
    
    if (href === '/sites') {
      return (location.pathname === '/sites' || 
              location.pathname.startsWith('/sites/')) &&
             !location.pathname.startsWith('/sites-management');
    }
    
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: { name: string; href: string; icon: React.ElementType } }) => {
    const active = isActive(item.href);
    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          active
            ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
            : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-[hsl(var(--sidebar-background))]">
      <div className="flex h-16 items-center justify-center px-4 border-b border-[hsl(var(--sidebar-border))]">
        <img 
          src="/logo-white.png" 
          alt="Cyber Energia" 
          className="h-8 w-auto object-contain"
        />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {/* Main navigation */}
        {mainNavigation.map((item) => (
          <NavLink key={item.name} item={item} />
        ))}

        {/* PCAP Collapsible Section */}
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
            {/* Highlighted submenu container */}
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

        {/* Bottom navigation */}
        <div className="pt-2">
          {bottomNavigation.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>
      </nav>
      
      {/* Active Jobs Indicator - above user info */}
      <ActiveJobsIndicator />
      
      <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
        {profile && (
          <div className="mb-3">
            <div className="text-sm font-medium text-white truncate">
              {profile.full_name}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {profile.email}
            </div>
          </div>
        )}
        <Separator className="bg-[hsl(var(--sidebar-border))] mb-3" />
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-[hsl(var(--sidebar-accent))]"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
        <div className="text-xs text-gray-500 mt-3">
          OT Scanner v0.2
        </div>
      </div>
    </div>
  );
};

export { Sidebar };