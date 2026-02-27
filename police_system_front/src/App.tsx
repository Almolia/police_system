import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import * as THREE from 'three';
// @ts-ignore
import NET from 'vanta/dist/vanta.net.min';

// Context & Auth
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './auth/AuthPage';
import SkeletonLoader from './components/common/SkeletonLoader';

// Features
import EvidenceManager from './features/evidence/EvidenceManager';
import FinanceDashboard from './features/finance/FinanceDashboard';
import PaymentCallback from './features/finance/PaymentCallback';
import CourtroomPanel from './features/legal/CourtroomPanel';
import CoronerPanel from './features/evidence/CoronerPanel';
import InvestigationPanel from './features/investigation/InvestigationPanel';
import HomePage from './features/home/HomePage';
import MostWantedPage from './features/investigation/MostWantedPage';
import AdminPanel from './features/admin/AdminPanel';

// ─── SMART ROLE ROUTING ───
const getDefaultRoute = (role?: string) => {
    if (!role) return '/auth';
    if (role === 'ADMIN') return '/admin';
    if (role === 'CITIZEN') return '/finance';
    if (['DETECTIVE', 'SERGEANT'].includes(role)) return '/investigation';
    if (['CORONER'].includes(role)) return '/coroner';
    if (['OFFICER'].includes(role)) return '/evidence';
    if (['JUDGE', 'CAPTAIN', 'CHIEF'].includes(role)) return '/court';
    return '/evidence'; 
};

function ProtectedRoute({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
    const { user, token, isLoading } = useAuth();

    if (isLoading) return <div className="h-screen flex items-center justify-center"><SkeletonLoader type="card" /></div>;
    if (!token) return <Navigate to="/auth" replace />;

    if (roles && user && !roles.includes(user.role)) {
        return <Navigate to={getDefaultRoute(user.role)} replace />;
    }

    return <>{children}</>;
}

// ─── PUBLIC HEADER ───
function PublicHeader() {
    return (
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
            <Link to="/" className="text-white font-black uppercase tracking-tighter italic text-2xl">
                BOI <span className="text-amber-500">SYSTEM</span>
            </Link>
            <Link to="/auth" className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase shadow-lg border border-amber-400/50">
                System Access / Login
            </Link>
        </div>
    );
}

// ─── LOGGED-IN NAVIGATION ───
function NavLinks() {
    const location = useLocation();
    const { user, logout } = useAuth();

    const activeClass = "bg-blue-600 text-white px-4 py-2 rounded-md transition-colors shadow-lg";
    const inactiveClass = "text-blue-100 hover:text-white hover:bg-blue-600 px-4 py-2 rounded-md transition-colors";

    const isCoronerStaff = ['DETECTIVE', 'CAPTAIN', 'CHIEF'].includes(user?.role || '');
    const isInvestigator = ['DETECTIVE', 'SERGEANT', 'CAPTAIN', 'CHIEF'].includes(user?.role || '');
    const isAdmin = user?.role === 'ADMIN';

    return (
        <nav className="bg-slate-900/90 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50 border-b border-blue-500/30">
            <div className="max-w-7xl mx-auto flex justify-between items-center font-bold">
                <div className="flex gap-4 items-center">
                    {user?.role !== 'CITIZEN' && !isAdmin && <Link to="/evidence" className={location.pathname === '/evidence' ? activeClass : inactiveClass}>Evidence Panel</Link>}
                    {isCoronerStaff && <Link to="/coroner" className={location.pathname === '/coroner' ? activeClass : inactiveClass}>Forensics Lab</Link>}
                    {!isAdmin && <Link to="/finance" className={location.pathname === '/finance' ? activeClass : inactiveClass}>Finance</Link>}
                    {!isAdmin && <Link to="/court" className={location.pathname === '/court' ? activeClass : inactiveClass}>Courtroom</Link>}
                    {isInvestigator && <Link to="/investigation" className={location.pathname === '/investigation' ? activeClass : inactiveClass}>Investigation Board</Link>}
                    {isAdmin && <Link to="/admin" className={location.pathname === '/admin' ? activeClass : inactiveClass}>System Admin</Link>}
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Active Duty</p>
                        <p className="text-white text-sm">{user?.username} <span className="text-amber-400">({user?.role})</span></p>
                    </div>
                    <button onClick={logout} className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1 rounded border border-red-500/50 transition-all text-xs">
                        Sign Out
                    </button>
                </div>
            </div>
        </nav>
    );
}

// ─── CORE LAYOUT ───
function AppContent() {
    const vantaRef = useRef(null);
    const { token, user } = useAuth(); 

    useEffect(() => {
        let effect: any = null;
        if (vantaRef.current) {
            effect = NET({
                el: vantaRef.current, THREE: THREE, mouseControls: true, touchControls: true, gyroControls: false,
                minHeight: 200.00, minWidth: 200.00, scale: 1.00, scaleMobile: 1.00, color: 0x4c4d89, backgroundColor: 0x170636, points: 9.00, maxDistance: 23.00, spacing: 17.00
            });
        }
        return () => { if (effect) effect.destroy(); };
    }, []);

    return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden pb-10 box-border relative">
            <div ref={vantaRef} className="absolute inset-0 z-0 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
                {token ? <NavLinks /> : <PublicHeader />}

                <main className="flex-grow overflow-x-hidden overflow-y-auto relative p-6">
                    <Routes>
                        {/* If logged in, visiting '/' auto-redirects to workstation */}
                        <Route path="/" element={token ? <Navigate to={getDefaultRoute(user?.role)} replace /> : <HomePage />} />
                        <Route path="/most-wanted" element={<MostWantedPage />} />
                        <Route path="/auth" element={token ? <Navigate to={getDefaultRoute(user?.role)} replace /> : <AuthPage />} />
                        
                        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPanel /></ProtectedRoute>} />
                        <Route path="/evidence" element={<ProtectedRoute roles={['OFFICER', 'SERGEANT', 'DETECTIVE', 'CAPTAIN', 'CHIEF', 'JUDGE']}><EvidenceManager /></ProtectedRoute>} />
                        <Route path="/coroner" element={<ProtectedRoute roles={['DETECTIVE', 'CAPTAIN', 'CHIEF']}><CoronerPanel /></ProtectedRoute>} />
                        <Route path="/finance" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
                        <Route path="/court" element={<ProtectedRoute><CourtroomPanel /></ProtectedRoute>} />
                        <Route path="/payment-callback" element={<PaymentCallback />} />
                        <Route path="/investigation" element={<ProtectedRoute roles={['DETECTIVE', 'SERGEANT', 'CAPTAIN', 'CHIEF']}><InvestigationPanel /></ProtectedRoute>} />
                        
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return <AuthProvider><Router><AppContent /></Router></AuthProvider>;
}