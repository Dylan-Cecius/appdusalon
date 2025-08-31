import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Building2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionBadgeProps {
  onUpgrade?: () => void;
}

const SubscriptionBadge = ({ onUpgrade }: SubscriptionBadgeProps) => {
  const { subscribed, subscription_tier, loading } = useSubscription();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-muted rounded w-20"></div>
      </div>
    );
  }

  if (!subscribed) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Gratuit
        </Badge>
        {onUpgrade && (
          <Button
            size="sm"
            onClick={onUpgrade}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  const getPlanConfig = () => {
    switch (subscription_tier) {
      case 'starter':
        return {
          icon: <Crown className="h-3 w-3" />,
          label: 'Starter',
          color: 'bg-gradient-to-r from-blue-500 to-blue-600'
        };
      case 'pro':
        return {
          icon: <Zap className="h-3 w-3" />,
          label: 'Pro',
          color: 'bg-gradient-to-r from-purple-500 to-purple-600'
        };
      case 'enterprise':
        return {
          icon: <Building2 className="h-3 w-3" />,
          label: 'Enterprise',
          color: 'bg-gradient-to-r from-yellow-500 to-yellow-600'
        };
      default:
        return {
          icon: <Crown className="h-3 w-3" />,
          label: 'Pro',
          color: 'bg-gradient-to-r from-green-500 to-green-600'
        };
    }
  };

  const config = getPlanConfig();

  return (
    <Badge className={`${config.color} text-white border-0`}>
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </Badge>
  );
};

export default SubscriptionBadge;