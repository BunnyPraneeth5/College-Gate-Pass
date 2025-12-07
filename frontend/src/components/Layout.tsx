import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
    title: string;
}

export function Layout({ children, title }: LayoutProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold truncate">{title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs sm:text-sm truncate">
                                {user?.first_name} {user?.last_name}
                            </span>
                            <span className="text-xs bg-blue-700 px-2 py-1 rounded-md capitalize whitespace-nowrap">
                                {user?.role?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm sm:text-base bg-blue-700 hover:bg-blue-800 active:bg-blue-900 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-semibold transition-colors whitespace-nowrap shadow-md"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 pb-20">
                {children}
            </main>
        </div>
    );
}
