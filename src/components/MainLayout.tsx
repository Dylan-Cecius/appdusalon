import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Calendar, CheckSquare, BarChart3, FileText, Settings as SettingsIcon, User, LogOut, Scissors, Crown, History, Mail, LayoutDashboard, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import SecurityAlert from '@/components/SecurityAlert';

interface MainLayoutProps {
  children: React.ReactNode;
  cartItemsCount?: number;
  onCartOpen?: () => void;
}

const MainLayout = ({ children, cartItemsCount = 0, onCartOpen }: MainLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { salonSettings } = useSupabaseSettings();

  // Sauvegarder la route actuelle dans localStorage
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath !== '/' && currentPath !== '/auth' && currentPath !== '/admin' && currentPath !== '/historique' && currentPath !== '/encaissements') {
      localStorage.setItem('lastVisitedSection', currentPath);
    }
  }, [location.pathname]);

  const navItems = [
    { path: '/dashboard', label: isMobile ? 'Home' : 'Dashboard', icon: LayoutDashboard },
    { path: '/pos', label: isMobile ? 'POS' : 'Encaissement', icon: Scissors },
    { path: '/clients', label: 'Clients', icon: Users },
    { path: '/agenda', label: 'Agenda', icon: Calendar },
    { path: '/stats', label: 'Stats', icon: BarChart3 },
    { path: '/abonnements', label: isMobile ? 'Pro' : 'Abonnement', icon: Crown },
  ];

  const mobileNavItems = [
    { path: '/todo', label: 'To-Do', icon: CheckSquare },
    { path: '/rapports', label: 'Rapports', icon: Mail },
    { path: '/parametres', label: 'Paramètres', icon: SettingsIcon },
  ];

  const allNavItems = [...navItems, ...mobileNavItems];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-primary font-dancing">
                  L'app du salon
                </h1>
                {!isMobile && (
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <SubscriptionBadge onUpgrade={() => navigate('/abonnements')} />
              {location.pathname === "/pos" && isMobile && onCartOpen && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCartOpen}
                  className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <ShoppingCart className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  <span className="text-xs">{cartItemsCount}</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/historique')} 
                className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <History className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                {!isMobile && "Historique"}
              </Button>
              {user?.email === 'dylan.cecius@gmail.com' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/admin')} 
                  className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <User className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  {!isMobile && "Admin"}
                </Button>
              )}
              {!isMobile && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Connecté en tant que:</p>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              )}
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut} 
                className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                {!isMobile && "Déconnexion"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-[73px] z-40">
        <div className="container mx-auto px-4 sm:px-6 py-2">
          <div className={cn(
            "flex items-center gap-2",
            isMobile ? "overflow-x-auto pb-2" : "justify-center"
          )}>
            {/* Navigation principale */}
            <div className={cn(
              "inline-flex items-center gap-1 p-1 bg-muted rounded-md",
              isMobile && "min-w-fit"
            )}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "hover:scale-105 active:scale-95 duration-200",
                      "flex gap-1 sm:gap-2",
                      isActive(item.path)
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Navigation mobile supplémentaire */}
            {isMobile && (
              <div className="inline-flex items-center gap-1">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                    >
                      <Button
                        variant={isActive(item.path) ? "default" : "outline"}
                        size="sm"
                        className="flex items-center gap-2 min-w-fit hover:scale-105 active:scale-95 transition-all duration-200"
                      >
                        <Icon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Navigation desktop pour les sections supplémentaires */}
            {!isMobile && (
              <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-md ml-2">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "hover:scale-105 active:scale-95 duration-200",
                        "flex gap-2",
                        isActive(item.path)
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Security Alert */}
        <SecurityAlert />
        
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
