import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface SecurityAlertProps {
  onDismiss?: () => void;
}

const SecurityAlert = ({ onDismiss }: SecurityAlertProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950 p-4 mb-4">
      <Alert className="border-0 bg-transparent p-0">
        <Shield className="h-4 w-4 text-green-600" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-green-800 dark:text-green-200">
              🔒 Protection des données clients activée
            </h4>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-green-700 hover:text-green-800 h-8 px-2"
              >
                {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span className="ml-1 text-xs">
                  {showDetails ? 'Masquer' : 'Détails'}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-green-700 hover:text-green-800 h-8 px-2 text-xs"
              >
                ✕
              </Button>
            </div>
          </div>
          
          <AlertDescription className="text-green-700 dark:text-green-300 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">
                Les données sensibles des clients sont maintenant protégées
              </span>
            </div>
            
            {showDetails && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="bg-white dark:bg-green-900 rounded-lg p-3 border border-green-200">
                  <h5 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Mesures de sécurité actives :
                  </h5>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Données masquées par défaut dans les calendriers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Récupération sélective des données sensibles</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Protection contre l'accès non autorisé</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Conformité RGPD - minimisation des données</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900 rounded-lg p-3 border border-amber-200">
                  <h5 className="font-semibold mb-2 flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-3 w-3" />
                    Comment révéler les données client :
                  </h5>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Cliquez sur l'icône 👁️ à côté des informations client masquées 
                    pour révéler temporairement les données sensibles. Les données 
                    seront automatiquement masquées à nouveau par sécurité.
                  </p>
                </div>
              </div>
            )}
          </AlertDescription>
        </div>
      </Alert>
    </Card>
  );
};

export default SecurityAlert;