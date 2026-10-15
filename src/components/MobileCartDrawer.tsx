import type { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

export default function MobileCartDrawer({ open, processing, onOpenChange, children }: {
  open: boolean;
  processing: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return <Drawer open={open} onOpenChange={onOpenChange} dismissible={!processing} repositionInputs={false}>
    <DrawerContent className="app-cart-drawer mt-0 overflow-hidden">
      <DrawerHeader className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <DrawerTitle>Panier</DrawerTitle>
          <Button variant="outline" className="min-h-11 min-w-11" disabled={processing} onClick={() => onOpenChange(false)}>Fermer le panier</Button>
        </div>
        <DrawerDescription className="sr-only">Vérifiez les articles et le prestataire avant de confirmer l’encaissement.</DrawerDescription>
      </DrawerHeader>
      <div data-vaul-no-drag className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-4">
        {children}
      </div>
    </DrawerContent>
  </Drawer>;
}
