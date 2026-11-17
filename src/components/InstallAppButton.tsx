import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getInstallState, isIos, promptInstall, subscribeInstall } from '@/lib/installPrompt';

interface InstallAppButtonProps {
  className?: string;
}

/**
 * Bouton « Installer l'app ».
 * - Android / ordinateur (Chrome, Edge) : ouvre la fenêtre d'installation du navigateur.
 * - iPhone / iPad, ou navigateur sans installation en un clic : affiche la marche à suivre.
 * - Masqué quand l'app est déjà installée et ouverte comme une app.
 */
const InstallAppButton = ({ className }: InstallAppButtonProps) => {
  const [state, setState] = useState(getInstallState);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => subscribeInstall(() => setState(getInstallState())), []);

  if (state.installed) return null;

  const ios = isIos();

  const handleClick = async () => {
    if (ios) {
      setHelpOpen(true);
      return;
    }
    const shown = await promptInstall();
    if (!shown) setHelpOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        className={cn('min-h-[48px] w-full justify-center gap-2 text-base touch-manipulation', className)}
      >
        <Download className="h-4 w-4" />
        Installer l'app
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Installer L'app du salon</DialogTitle>
            <DialogDescription>
              {ios
                ? "Sur iPhone et iPad, l'installation se fait depuis Safari, en deux étapes."
                : "Votre navigateur n'a pas proposé l'installation automatique. Voici comment faire."}
            </DialogDescription>
          </DialogHeader>

          {ios ? (
            <ol className="space-y-4 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Ouvrez cette page dans <strong>Safari</strong>, puis touchez le bouton <strong>Partager</strong> (le
                  carré avec une flèche vers le haut).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <SquarePlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong>, puis <strong>Ajouter</strong>.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-4 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <MoreVertical className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Dans <strong>Chrome</strong> ou <strong>Edge</strong>, ouvrez le menu du navigateur (les trois points,
                  en haut à droite).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Choisissez <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong>.
                  Si vous ne voyez pas cette option, l'app est peut-être déjà installée.
                </span>
              </li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppButton;
