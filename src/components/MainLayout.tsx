import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Calendar, CheckSquare, Settings as SettingsIcon, User, LogOut, Scissors, History, Mail, LayoutDashboard, Users, MessageSquare, Package, Store, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import logoImg from '@/assets/logo-auth.png';

interface MainLayoutProps {
  children: React.ReactNode;
  cartItemsCount?: number;
  onCartOpen?: () => void;
}

const allNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pos', label: 'Encaissement', icon: Scissors },
  { path: '/services', label: 'Services', icon: Scissors },
  { path: '/produits', label: 'Produits', icon: Store },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/sms', label: 'SMS', icon: MessageSquare },
  { path: '/equipe', label: 'Équipe', icon: Users },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/stocks', label: 'Stocks', icon: Package },
  { path: '/todo', label: 'To-Do', icon: CheckSquare },
  { path: '/rapports', label: 'Rapports', icon: Mail },
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user?.email === 'demo@appdusalon.com' && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wide">
                  Mode Démo
                </span>
              )}
              <div>
                <img src={logoImg} alt="L'app du salon" className="h-36 sm:h-42 w-auto" />
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
            
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
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
                className="flex items-center gap-1 sm:gap-2 hover:scale-105 active:scale-95 transition-all duration-200 px-2 sm:px-3"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historique</span>
              </Button>
              {user?.email === 'dylan.cecius@gmail.com' && !isMobile && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/admin')} 
                  className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <User className="h-4 w-4" />
                  Admin
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
                type="button"
                onClick={() => signOut()} 
                onTouchEnd={(e) => { e.preventDefault(); signOut(); }}
                className="flex items-center gap-1 sm:gap-2 hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation px-2 sm:px-3"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation - Desktop: flex-wrap, Mobile: hamburger */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-[73px] z-40">
        <div className="container mx-auto px-4 py-2 sm:px-6">
          {/* Desktop: all items in a wrapping flex container */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-1 rounded-md bg-muted p-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm font-medium transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    isActive(item.path)
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile: hamburger button showing current page */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center gap-2"
            >
              <Menu className="h-4 w-4" />
              Menu
            </Button>
            <span className="text-sm font-medium text-foreground">
              {allNavItems.find(item => isActive(item.path))?.label || 'Navigation'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col py-2">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-accent text-accent-foreground border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-screen-2xl">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
