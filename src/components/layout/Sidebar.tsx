import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Server,
  Table,
  Upload,
  Settings,
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Sites', href: '/sites', icon: Server },
  { name: 'Variáveis', href: '/variables', icon: Table },
  { name: 'Upload PCAP', href: '/upload', icon: Upload },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();

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
        <div className="text-xs text-slate-500">
          Middleware OT v0.2
        </div>
      </div>
    </div>
  );
};