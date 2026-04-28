import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Calendar, CheckSquare, Settings as SettingsIcon, User, LogOut,
  Scissors, History, Mail, LayoutDashboard, Users, MessageSquare, Package,
  Store, Menu, TrendingUp, Bell
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MainLayoutProps {
  children: React.ReactNode;
  cartItemsCount?: number;
  onCartOpen?: () => void;
}

const PRIMARY_NAV = [
  { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/pos', label: 'Encaissement', icon: ShoppingCart },
  { path: '/stats', label: 'Statistiques', icon: TrendingUp },
];

const SECONDARY_NAV = [
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/services', label: 'Services', icon: Scissors },
  { path: '/produits', label: 'Produits', icon: Store },
  { path: '/equipe', label: 'Équipe', icon: Users },
  { path: '/sms', label: 'SMS', icon: MessageSquare },
  { path: '/stocks', label: 'Stocks', icon: Package },
  { path: '/todo', label: 'To-Do', icon: CheckSquare },
  { path: '/rapports', label: 'Rapports', icon: Mail },
  { path: '/ca-total', label: 'CA Total', icon: TrendingUp },
  { path: '/parametres', label: 'Paramètres', icon: SettingsIcon },
];

const MainLayout = ({ children, cartItemsCount = 0, onCartOpen }: MainLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { salonSettings } = useSupabaseSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath !== '/' && currentPath !== '/auth' && currentPath !== '/admin' && currentPath !== '/historique' && currentPath !== '/encaissements') {
      localStorage.setItem('lastVisitedSection', currentPath);
    }
  }, [location.pathname]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const userInitials = (user?.email || 'U').slice(0, 2).toUpperCase();

  const NavItem = ({ item }: { item: typeof PRIMARY_NAV[number] }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive(item.path)
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
        )}
      >
        {isActive(item.path) && (
          <span className="absolute -left-3.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
        )}
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar — desktop */}
        {!isMobile && (
          <aside className="sticky top-0 flex h-screen w-60 flex-col gap-1 border-r border-border bg-sidebar p-4">
            <div className="mb-4 flex items-center gap-2.5 border-b border-border/40 px-2 pb-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-serif text-2xl italic leading-none">
                a
              </div>
              <div className="flex flex-col leading-tight">
                <strong className="text-sm font-semibold tracking-tight">{salonSettings?.salonName || "L'app du salon"}</strong>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">premium</span>
              </div>
            </div>

            <div className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Principal</div>
            {PRIMARY_NAV.map(item => <NavItem key={item.path} item={item} />)}

            <div className="px-3 pb-1 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Gestion</div>
            {SECONDARY_NAV.map(item => <NavItem key={item.path} item={item} />)}

            <div className="mt-auto border-t border-border/40 pt-3">
              <div className="flex items-center gap-2.5 rounded-lg bg-secondary px-2.5 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-pos-card text-xs font-semibold text-primary-foreground">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{user?.email?.split('@')[0]}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{user?.email}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => signOut()} title="Déconnexion">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </aside>
        )}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar — actions globales (mobile menu trigger + cart + history) */}
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button variant="outline" size="icon" onClick={() => setMobileMenuOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              {user?.email === 'demo@appdusalon.com' && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Mode Démo
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {location.pathname === '/pos' && isMobile && onCartOpen && (
                <Button variant="outline" size="sm" onClick={onCartOpen}>
                  <ShoppingCart className="mr-1 h-4 w-4" />
                  <span className="text-xs">{cartItemsCount}</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/historique')}>
                <History className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Historique</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Bell className="h-4 w-4" />
              </Button>
              {user?.email === 'dylan.cecius@gmail.com' && !isMobile && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                  <User className="h-4 w-4" /> Admin
                </Button>
              )}
              {isMobile && (
                <Button variant="outline" size="icon" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </header>

          {/* Mobile drawer */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle>{salonSettings?.salonName || "L'app du salon"}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-0.5 p-3">
                <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Principal</div>
                {PRIMARY_NAV.map(item => <NavItem key={item.path} item={item} />)}
                <div className="px-3 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Gestion</div>
                {SECONDARY_NAV.map(item => <NavItem key={item.path} item={item} />)}
              </nav>
            </SheetContent>
          </Sheet>

          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-7 sm:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
