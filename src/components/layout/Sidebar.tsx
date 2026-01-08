import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/brand/Logo';
import {
  LayoutDashboard,
  Server,
  Table,
  Upload,
  Settings,
  Users,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const Sidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sites', href: '/sites', icon: Server },
    { name: 'Variáveis', href: '/variables', icon: Table },
    { name: 'Upload PCAP', href: '/upload', icon: Upload },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  // Add user management for admins
  if (profile?.is_admin) {
    navigation.push({ name: 'Usuários', href: '/users', icon: Users });
  }

  return (
    <div className="flex h-full w-64 flex-col bg-[hsl(var(--sidebar-background))]">
      <div className="flex h-16 items-center px-4 border-b border-[hsl(var(--sidebar-border))]">
        <Logo variant="full" dark />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
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
          Sair
        </Button>
        <div className="text-xs text-gray-500 mt-3">
          Middleware OT v0.2
        </div>
      </div>
    </div>
  );
};

export { Sidebar };