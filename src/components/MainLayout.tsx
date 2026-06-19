import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Calendar, CheckSquare, Settings as SettingsIcon, User, LogOut,
  Scissors, History, Mail, LayoutDashboard, Users, MessageSquare, Package, Store,
  TrendingUp, Home, MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import logoImg from '@/assets/logo-auth.png';

interface MainLayoutProps {
  children: React.ReactNode;
  cartItemsCount?: number;
  onCartOpen?: () => void;
}

const navGroups = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/pos', label: 'Encaissement', icon: Scissors },
      { path: '/agenda', label: 'Agenda', icon: Calendar },
      { path: '/clients', label: 'Clients', icon: Users },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { path: '/services', label: 'Services', icon: Scissors },
      { path: '/produits', label: 'Produits', icon: Store },
      { path: '/stocks', label: 'Stocks', icon: Package },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { path: '/ca-total', label: 'CA Total', icon: TrendingUp },
      { path: '/equipe', label: 'Équipe', icon: Users },
      { path: '/sms', label: 'SMS', icon: MessageSquare },
      { path: '/todo', label: 'To-Do', icon: CheckSquare },
      { path: '/rapports', label: 'Rapports', icon: Mail },
      { path: '/parametres', label: 'Paramètres', icon: SettingsIcon },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

const bottomNavItems = [
  { path: '/dashboard', label: 'Accueil', icon: Home },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/pos', label: 'Caisse', icon: Scissors },
  { path: '/clients', label: 'Clients', icon: Users },
];

const MainLayout = ({ children, cartItemsCount = 0, onCartOpen }: MainLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath !== '/' && currentPath !== '/auth' && currentPath !== '/admin' && currentPath !== '/historique' && currentPath !== '/encaissements') {
      localStorage.setItem('lastVisitedSection', currentPath);
    }
  }, [location.pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const pageTitle = allNavItems.find((item) => isActive(item.path))?.label || 'Tableau de bord';
  const isDemo = user?.email === 'demo@appdusalon.com';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[220px] flex-col border-r border-border bg-sidebar">
        <div className="flex items-center justify-center px-4 py-4 border-b border-border">
          <img src={logoImg} alt="L'app du salon" className="h-20 w-auto" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.path)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User block */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.email}</p>
              {isDemo && <p className="text-[11px] font-semibold uppercase text-primary">Mode démo</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => signOut()}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="md:pl-[220px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoImg} alt="L'app du salon" className="h-9 w-auto md:hidden" />
            <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            {location.pathname === '/pos' && isMobile && onCartOpen && (
              <Button variant="outline" size="sm" onClick={onCartOpen} className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs">{cartItemsCount}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/historique')}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-screen-2xl px-4 py-4 pb-24 sm:px-6 sm:py-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-border bg-card md:hidden">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
          Plus
        </button>
      </nav>

      {/* Mobile "Plus" menu */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col overflow-y-auto py-2">
            {navGroups.map((group) => (
              <div key={group.label} className="py-1">
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                        isActive(item.path)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
            <div className="border-t border-border mt-1 p-2">
              <Button
                variant="ghost"
                onClick={() => signOut()}
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MainLayout;
