import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Server,
  Table,
  Upload,
  Settings,
  Zap,
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
    <div className="flex h-full w-64 flex-col bg-slate-900">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-800">
        <Zap className="h-8 w-8 text-emerald-500" />
        <span className="text-xl font-bold text-white">CyberEnergia</span>
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        {profile && (
          <div className="mb-3">
            <div className="text-sm font-medium text-white truncate">
              {profile.full_name}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {profile.email}
            </div>
          </div>
        )}
        <Separator className="bg-slate-700 mb-3" />
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
        <div className="text-xs text-slate-500 mt-3">
          Middleware OT v0.2
        </div>
      </div>
    </div>
  );
};

export { Sidebar };