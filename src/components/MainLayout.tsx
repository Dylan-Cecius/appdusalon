import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Calendar, CheckSquare, Settings as SettingsIcon, LogOut,
  Scissors, History, Mail, LayoutDashboard, Users, MessageSquare, Package, Store,
  TrendingUp, Home, MoreHorizontal, Crown, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import logoImg from '@/assets/logo-auth.png';
import { isDemoOnlyPreview } from '@/lib/previewSafety';

interface MainLayoutProps {
  children: React.ReactNode;
  cartItemsCount?: number;
  onCartOpen?: () => void;
}

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  externalAction?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { path: '/pos', label: 'Encaissement', icon: Scissors },
      { path: '/agenda', label: 'Agenda', icon: Calendar },
      { path: '/clients', label: 'Clients', icon: Users },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { path: '/services', label: 'Services', icon: Scissors },
      { path: '/produits', label: 'Produits', icon: Store, adminOnly: true },
      { path: '/stocks', label: 'Stocks', icon: Package, adminOnly: true },
    ],
  },
  {
    label: 'Pilotage',
    items: [
      { path: '/ca-total', label: 'Chiffre d’affaires', icon: TrendingUp, adminOnly: true },
      { path: '/equipe', label: 'Équipe', icon: Users, adminOnly: true },
      { path: '/sms', label: 'SMS', icon: MessageSquare, adminOnly: true, externalAction: true },
      { path: '/todo', label: 'To-do', icon: CheckSquare },
      { path: '/rapports', label: 'Rapports', icon: Mail, adminOnly: true, externalAction: true },
      { path: '/abonnements', label: 'Abonnement', icon: Crown, adminOnly: true, externalAction: true },
      { path: '/parametres', label: 'Paramètres', icon: SettingsIcon, adminOnly: true },
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
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname;
    if (!['/', '/auth', '/admin', '/historique', '/encaissements'].includes(currentPath)) {
      localStorage.setItem('lastVisitedSection', currentPath);
    }
  }, [location.pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const visibleNavGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        (!item.adminOnly || permissions.isAdmin) &&
        (!isDemoOnlyPreview || !item.externalAction)
      ),
    }))
    .filter(group => group.items.length > 0);

  const visibleNavItems = visibleNavGroups.flatMap(group => group.items);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/abonnements' && location.pathname === '/abonnement');

  const pageTitle = visibleNavItems.find((item) => isActive(item.path))?.label
    || allNavItems.find((item) => isActive(item.path))?.label
    || 'Tableau de bord';
  const isDemo = user?.email === 'demo@appdusalon.com';
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'US';

  return (
    <div className="app-safe-shell bg-background text-foreground">
      <aside className="app-safe-sidebar hidden md:flex fixed inset-y-0 left-0 z-40 w-[236px] flex-col border-r border-border/80 bg-slate-950 text-white shadow-xl">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <img src={logoImg} alt="L'app du salon" className="h-9 w-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">L’App du Salon</p>
              <p className="text-xs text-slate-400">Espace professionnel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          <div className="space-y-4">
            {visibleNavGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        active
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', !active && 'group-hover:text-white')} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="h-4 w-4 opacity-70" />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.email}</p>
              <p className="text-[11px] text-slate-400">{isDemo ? 'Mode démonstration' : 'Compte connecté'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => signOut()}
              className="h-9 w-9 shrink-0 rounded-xl text-slate-400 hover:bg-white/10 hover:text-red-300"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="md:pl-[236px]">
        <header className="app-safe-header sticky top-0 z-30 border-b border-border/70 bg-white/92 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
                L’App du Salon
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-2">
              {location.pathname === '/pos' && isMobile && onCartOpen && (
                <Button variant="outline" size="sm" onClick={onCartOpen} className="rounded-xl">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {cartItemsCount}
                </Button>
              )}
              {!permissionsLoading && permissions.canManageTransactions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/historique')}
                  className="rounded-xl bg-card/80"
                >
                  <History className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Historique</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1680px] px-4 py-4 pb-24 sm:px-6 sm:py-5 md:pb-8">
          {children}
        </main>
      </div>

      <nav aria-label="Navigation principale" className="app-safe-bottom-nav fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-border/80 bg-card/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 backdrop-blur-xl md:hidden">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <span className={cn('rounded-lg p-1.5', active && 'bg-white/10')}>
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold text-muted-foreground"
        >
          <span className="rounded-lg p-1.5">
            <MoreHorizontal className="h-5 w-5" />
          </span>
          Plus
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right" className="w-[86vw] max-w-sm p-0">
          <SheetHeader className="border-b border-border p-5 text-left">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-72px)] overflow-y-auto px-3 py-4">
            <div className="space-y-5">
              {visibleNavGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                            active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-3">
                <Button
                  variant="ghost"
                  onClick={() => signOut()}
                  className="w-full justify-start rounded-xl text-destructive hover:text-destructive"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MainLayout;
