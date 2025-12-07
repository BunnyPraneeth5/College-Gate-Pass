import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../api/client';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: User['role'][];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        const redirectPath = getRoleBasedPath(user.role);
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
}

export function getRoleBasedPath(role: User['role']): string {
    switch (role) {
        case 'student':
            return '/student/dashboard';
        case 'hod':
            return '/hod/dashboard';
        case 'principal':
            return '/principal/dashboard';
        case 'security':
            return '/security/dashboard';
        case 'class_incharge':
            return '/hod/dashboard'; // Class incharge uses same dashboard as HOD
        case 'faculty':
            return '/faculty/dashboard';
        case 'admin':
            return '/admin/dashboard';
        default:
            return '/login';
    }
}
