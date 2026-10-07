import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions, type Permissions } from '@/hooks/usePermissions';

type BooleanPermissionKey = {
  [K in keyof Permissions]: Permissions[K] extends boolean ? K : never
}[keyof Permissions];

interface PermissionGuardProps {
  children: ReactNode;
  permission: BooleanPermissionKey;
}

const PermissionGuard = ({ children, permission }: PermissionGuardProps) => {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Vérification des autorisations…
      </div>
    );
  }

  if (!permissions[permission]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
