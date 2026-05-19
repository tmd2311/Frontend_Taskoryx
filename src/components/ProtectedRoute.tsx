import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { usePermissionStore } from '../stores/permissionStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Một permission string, hoặc mảng — thoả mãn khi có ÍT NHẤT 1 quyền */
  requiredPermission?: string | string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { isAuthenticated, mustChangePassword, isAdmin } = useAuthStore();
  const { hasPermission, loaded: permLoaded } = usePermissionStore();
  const location = useLocation();
  const deniedRef = useRef(false);

  const isDenied = (() => {
    if (!requiredPermission || !permLoaded || isAdmin) return false;
    const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    return !perms.some((p) => hasPermission(p));
  })();

  useEffect(() => {
    if (isDenied && !deniedRef.current) {
      deniedRef.current = true;
      Modal.error({
        title: 'Không có quyền truy cập',
        content: 'Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ quản trị viên.',
        icon: <LockOutlined style={{ color: '#ef4444' }} />,
        okText: 'Đóng',
        centered: true,
        onOk: () => { deniedRef.current = false; },
        onCancel: () => { deniedRef.current = false; },
      });
    }
  }, [isDenied]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (isDenied) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
