import { useStaff } from '@/hooks/useStaff';
import { CartContents, type CartSidebarProps } from '@/components/CartContents';
export default function CartSidebar(props: CartSidebarProps) {
  const { activeStaff } = useStaff();
  return <CartContents {...props} activeStaff={activeStaff} />;
}
