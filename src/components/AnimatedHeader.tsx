import { useState, useEffect } from 'react';
import { Scissors, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const AnimatedHeader = ({ title, subtitle, className }: AnimatedHeaderProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-4 left-4 animate-float delay-100">
          <Scissors className="h-4 w-4 text-accent/30" />
        </div>
        <div className="absolute top-8 right-8 animate-float delay-300">
          <Sparkles className="h-3 w-3 text-primary/30" />
        </div>
        <div className="absolute bottom-4 left-12 animate-float delay-500">
          <Star className="h-3 w-3 text-accent/40" />
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "text-center transition-all duration-1000 transform",
          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        )}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-lg animate-fade-in">{subtitle}</p>
        )}
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-accent/60 rounded-full animate-ping delay-200"></div>
        <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/60 rounded-full animate-ping delay-700"></div>
        <div className="absolute bottom-1/3 left-2/3 w-1.5 h-1.5 bg-accent/40 rounded-full animate-ping delay-1000"></div>
      </div>
    </div>
  );
};

export default AnimatedHeader;