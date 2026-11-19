import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Calendar, CheckSquare, Settings as SettingsIcon, User, LogOut,
  Scissors, History, Mail, LayoutDashboard, Users, MessageSquare, Package, Store,
  TrendingUp, Home, LayoutGrid, CreditCard, ChevronRight, Crown, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import logoImg from '@/assets/logo-dore.png';
import InstallAppButton from '@/components/InstallAppButton';
import { canSeeSubscriptions } from '@/hooks/useSubscriptionRights';
import { toast } from '@/hooks/use-toast';

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
      { path: '/stats', label: 'Stats', icon: BarChart3 },
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
  { path: '/pos', label: 'Caisse', icon: CreditCard },
  { path: '/clients', label: 'Clients', icon: Users },
];

const bottomNavPaths = bottomNavItems.map((item) => item.path);
const moreGroups = navGroups
  .map((group) => ({ ...group, items: group.items.filter((item) => !bottomNavPaths.includes(item.path)) }))
  .filter((group) => group.items.length > 0);

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
  const pageTitle =
    allNavItems.find((item) => isActive(item.path))?.label ||
    (isActive('/abonnement') ? 'Abonnement' : 'Tableau de bord');
  const isDemo = user?.email === 'demo@appdusalon.com';
  const showSubscription = canSeeSubscriptions(user?.email);

  // Retour de la page de paiement Stripe (/?subscription=success ou cancelled)
  useEffect(() => {
    const result = new URLSearchParams(location.search).get('subscription');
    if (!result) return;
    if (result === 'success') {
      toast({ title: 'Abonnement activé', description: 'Merci ! Votre abonnement est en cours d\'activation.' });
    } else if (result === 'cancelled') {
      toast({ title: 'Paiement annulé', description: 'Aucun montant n\'a été débité.' });
    }
    navigate('/abonnement', { replace: true });
  }, [location.search, navigate]);
  const moreActive = moreGroups.some((group) => group.items.some((item) => isActive(item.path)));

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center px-5 py-5 border-b border-sidebar-border">
          <img src={logoImg} alt="L'app du salon" className="h-14 w-auto" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/70">
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
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
          {showSubscription && (
            <Link
              to="/abonnement"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive('/abonnement')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground hover:bg-white/10 hover:text-white'
              )}
            >
              <Crown className="h-4 w-4 shrink-0" />
              Abonnement
            </Link>
          )}
        </nav>

        {/* User block */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.email}</p>
              {isDemo && <p className="text-[11px] font-semibold uppercase text-sidebar-primary">Mode démo</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => signOut()}
              className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-white/10 hover:text-white"
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <h1
              className={cn(
                'truncate text-lg font-semibold text-foreground sm:text-xl',
                // Ces écrans affichent déjà leur propre titre sur mobile
                ['/', '/dashboard', '/agenda', '/pos', '/clients'].includes(location.pathname) && 'invisible md:visible'
              )}
            >
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {location.pathname === '/pos' && isMobile && onCartOpen && (
              <Button variant="outline" size="sm" onClick={onCartOpen} className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs">{cartItemsCount}</span>
              </Button>
            )}
            {showSubscription && !isActive('/abonnement') && (
              <Button
                size="sm"
                onClick={() => navigate('/abonnement')}
                className="flex items-center gap-2 bg-gold font-semibold text-ink hover:bg-gold/85"
              >
                <Crown className="h-4 w-4" />
                S'abonner
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
        <main className="mx-auto max-w-screen-2xl px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const showBadge = item.path === '/pos' && cartItemsCount > 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                active ? 'text-sidebar-primary' : 'text-sidebar-foreground'
              )}
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" />
                {showBadge && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[11px] font-bold text-sidebar-primary-foreground">
                    {cartItemsCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
            moreActive || moreOpen ? 'text-sidebar-primary' : 'text-sidebar-foreground'
          )}
        >
          <LayoutGrid className="h-[22px] w-[22px]" />
          Plus
        </button>
      </nav>

      {/* Mobile "Plus" menu */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-0 bg-background p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="px-5 pt-6 pb-2 text-left">
            <SheetTitle className="font-display text-2xl font-bold">Plus</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            <div className="flex items-center gap-3 rounded-2xl bg-sidebar p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user?.email}</p>
                {isDemo && <p className="text-[11px] font-semibold uppercase text-sidebar-primary">Mode démo</p>}
              </div>
            </div>

            {moreGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex min-h-[56px] items-center gap-3 border-b border-border px-3 text-[15px] font-semibold text-foreground transition-colors last:border-b-0 active:bg-muted',
                          isActive(item.path) && 'bg-accent'
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {showSubscription && (
              <Button asChild variant="outline" className="h-12 w-full justify-center gap-2 rounded-2xl">
                <Link to="/abonnement">
                  <Crown className="h-4 w-4" />
                  Abonnement
                </Link>
              </Button>
            )}

            <InstallAppButton className="h-12 rounded-2xl" />

            <Button
              variant="outline"
              onClick={() => signOut()}
              className="h-12 w-full justify-center gap-2 rounded-2xl text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MainLayout;
