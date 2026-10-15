import CartPanel, { type CartPanelProps } from '@/components/CartPanel';
import { useStaff } from '@/hooks/useStaff';

export default function CartSidebar(props: Omit<CartPanelProps, 'activeStaff'>) {
  const { activeStaff } = useStaff();
  return <CartPanel {...props} activeStaff={activeStaff} />;
}
