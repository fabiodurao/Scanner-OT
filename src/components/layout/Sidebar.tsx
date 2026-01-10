import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Server,
  Table,
  Upload,
  Settings,
  Users,
  LogOut,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const Sidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sites Management', href: '/sites-management', icon: Building2 },
    { name: 'Sites', href: '/sites', icon: Server },
    { name: 'Variables', href: '/variables', icon: Table },
    { name: 'PCAP Upload', href: '/upload', icon: Upload },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Add user management for admins
  if (profile?.is_admin) {
    navigation.push({ name: 'Users', href: '/users', icon: Users });
  }

  const isActive = (href: string) => {
    // Exact match for root path
    if (href === '/') {
      return location.pathname === '/';
    }
    
    // For /sites-management, only match exactly or with sub-paths
    if (href === '/sites-management') {
      return location.pathname === '/sites-management' || 
             location.pathname.startsWith('/sites-management/');
    }
    
    // For /sites, match exactly or with sub-paths, but NOT /sites-management
    if (href === '/sites') {
      return (location.pathname === '/sites' || 
              location.pathname.startsWith('/sites/')) &&
             !location.pathname.startsWith('/sites-management');
    }
    
    // For other routes, use startsWith
    return location.pathname.startsWith(href);
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
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
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
        })}
      </nav>
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