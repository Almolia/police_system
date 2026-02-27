import { useEffect, useRef } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    Navigate,
    useLocation,
} from 'react-router-dom';
import * as THREE from 'three';
// @ts-ignore
import NET from 'vanta/dist/vanta.net.min';

// Context & Auth
import { AuthProvider, useAuth } from './context/AuthContext';

// Feature Components
import EvidenceManager from './features/evidence/EvidenceManager';
import FinanceDashboard from './features/finance/FinanceDashboard';
import PaymentCallback from './features/finance/PaymentCallback';
import CourtroomPanel from './features/legal/CourtroomPanel';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import SkeletonLoader from './components/common/SkeletonLoader';

// ─── PROTECTED ROUTE ───────────────────────────────────────────────────────────
function ProtectedRoute({
                            children,
                            roles,
                        }: {
    children: React.ReactNode;
    roles?: string[];
}) {
    const { user, token, isLoading } = useAuth();

    if (isLoading)
        return (
            <div className="h-screen flex items-center justify-center">
                <SkeletonLoader type="card" />
            </div>
        );

    if (!token) return <Navigate to="/login" replace />;

    if (roles && user && !roles.includes(user.role)) {
        if (user.role === 'CITIZEN') return <Navigate to="/finance" replace />;
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

// ─── NAV BAR ──────────────────────────────────────────────────────────────────
function NavLinks() {
    const location = useLocation();
    const { user, logout } = useAuth();

    const active = 'bg-blue-600 text-white px-4 py-2 rounded-md transition-colors shadow-lg';
    const inactive = 'text-blue-100 hover:text-white hover:bg-blue-600 px-4 py-2 rounded-md transition-colors';

    return (
        <nav className="bg-slate-900/90 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50 border-b border-blue-500/30">
            <div className="max-w-6xl mx-auto flex justify-between items-center font-bold">
                <div className="flex gap-4">
                    {/* Evidence فقط برای غیر CITIZEN */}
                    {user?.role !== 'CITIZEN' && (
                        <Link to="/" className={location.pathname === '/' ? active : inactive}>
                            Evidence Panel
                        </Link>
                    )}
                    <Link to="/finance" className={location.pathname === '/finance' ? active : inactive}>
                        Finance
                    </Link>
                    <Link to="/court" className={location.pathname === '/court' ? active : inactive}>
                        Courtroom
                    </Link>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Active Duty</p>
                        <p className="text-white text-sm">
                            {user?.username}{' '}
                            <span className="text-amber-400">({user?.role})</span>
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1 rounded border border-red-500/50 transition-all text-xs"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </nav>
    );
}

// ─── CORE LAYOUT ──────────────────────────────────────────────────────────────
function AppContent() {
    const vantaRef = useRef(null);
    const { token } = useAuth();

    useEffect(() => {
        let effect: any = null;
        if (vantaRef.current) {
            effect = NET({
                el: vantaRef.current,
                THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200,
                minWidth: 200,
                scale: 1,
                scaleMobile: 1,
                color: 0x4c4d89,
                backgroundColor: 0x170636,
                points: 9,
                maxDistance: 23,
                spacing: 17,
            });
        }
        return () => { if (effect) effect.destroy(); };
    }, []);

    return (
        <div ref={vantaRef} className="min-h-screen font-sans overflow-auto bg-slate-900">
            {/* NavBar فقط وقتی لاگین هستیم نشون داده میشه */}
            {token && <NavLinks />}

            <div className="p-6 relative z-10">
                <Routes>
                    {/* Public */}
                    <Route path="/login"    element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/payment-callback" element={<PaymentCallback />} />

                    {/* Protected */}
                    <Route path="/" element={
                        <ProtectedRoute roles={['OFFICER','SERGEANT','DETECTIVE','CAPTAIN','CHIEF','JUDGE']}>
                            <EvidenceManager />
                        </ProtectedRoute>
                    } />
                    <Route path="/finance" element={
                        <ProtectedRoute>
                            <FinanceDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/court" element={
                        <ProtectedRoute>
                            <CourtroomPanel />
                        </ProtectedRoute>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────
export default function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}
