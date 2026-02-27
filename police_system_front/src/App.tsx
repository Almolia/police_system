import React, { useEffect, useRef, useState } from 'react';
import CaseManager from './features/cases/CaseManager';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import * as THREE from 'three';
// @ts-ignore
import NET from 'vanta/dist/vanta.net.min';
import api from './utils/api';

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
import ActiveCasesBoard from './features/cases/ActiveCasesBoard';

// ─── SMART ROLE ROUTING ───
const getDefaultRoute = (role?: string) => {
    if (!role) return '/auth';
    if (role === 'ADMIN') return '/admin';
    if (role === 'CITIZEN') return '/cases';
    if (['CADET'].includes(role)) return '/cases';
    if (['DETECTIVE', 'SERGEANT'].includes(role)) return '/investigation';
    if (['CORONER'].includes(role)) return '/coroner';
    if (['OFFICER'].includes(role)) return '/evidence';
    if (['JUDGE', 'CAPTAIN', 'CHIEF'].includes(role)) return '/court';
    return '/cases'; 
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

// ─── NAVIGATION COMPONENT ───
// ─── NAVIGATION COMPONENT ───
function NavLinks() {
    const location = useLocation();
    const { user, logout } = useAuth();

    const activeClass = "bg-blue-600 text-white px-4 py-2 rounded-md transition-colors shadow-lg whitespace-nowrap";
    const inactiveClass = "text-blue-100 hover:text-white hover:bg-blue-600 px-4 py-2 rounded-md transition-colors whitespace-nowrap";

    const isCoronerStaff = ['DETECTIVE', 'CAPTAIN', 'CHIEF'].includes(user?.role || '');
    const isInvestigator = ['DETECTIVE', 'SERGEANT', 'CAPTAIN', 'CHIEF'].includes(user?.role || '');
    const isAdmin = user?.role === 'ADMIN';
    const isCaseManager = ['CITIZEN', 'CADET', 'OFFICER', 'SERGEANT', 'DETECTIVE', 'CAPTAIN', 'CHIEF'].includes(user?.role || '');

    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        // Only police/command need the notification system
        if (!user || user.role === 'CITIZEN' || user.role === 'ADMIN') return; 
        try {
            const res = await api.get('investigation/notifications/');
            setNotifications(res.data.results || res.data);
        } catch (err) { console.error("Notification fetch failed"); }
    };

    useEffect(() => {
        fetchNotifications();
        // Live poll the backend every 30 seconds for new alerts
        const interval = setInterval(fetchNotifications, 30000); 
        return () => clearInterval(interval);
    }, [user]);

    // Close dropdown when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAsRead = async (id: number) => {
        try {
            await api.post(`investigation/notifications/${id}/mark_read/`);
            fetchNotifications();
        } catch (err) {}
    };

    const markAllRead = async () => {
        try {
            await api.post(`investigation/notifications/mark_all_read/`);
            fetchNotifications();
        } catch (err) {}
    };

    return (
        <nav className="bg-slate-900/90 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50 border-b border-blue-500/30">
            <div className="w-full px-8 flex justify-between items-center font-bold gap-8">
                <div className="flex gap-2 items-center overflow-x-auto no-scrollbar">
                    {isCaseManager && !isAdmin && <Link to="/cases" className={location.pathname === '/cases' ? activeClass : inactiveClass}>Case Intake</Link>}
                    {!isAdmin && <Link to="/active-board" className={location.pathname === '/active-board' ? activeClass : inactiveClass}>Precinct Board</Link>}
                    {user?.role !== 'CITIZEN' && !isAdmin && <Link to="/evidence" className={location.pathname === '/evidence' ? activeClass : inactiveClass}>Evidence Panel</Link>}
                    {isCoronerStaff && <Link to="/coroner" className={location.pathname === '/coroner' ? activeClass : inactiveClass}>Forensics Lab</Link>}
                    {!isAdmin && <Link to="/finance" className={location.pathname === '/finance' ? activeClass : inactiveClass}>Finance</Link>}
                    {!isAdmin && <Link to="/court" className={location.pathname === '/court' ? activeClass : inactiveClass}>Courtroom</Link>}
                    {isInvestigator && <Link to="/investigation" className={location.pathname === '/investigation' ? activeClass : inactiveClass}>Investigation Board</Link>}
                    {isAdmin && <Link to="/admin" className={location.pathname === '/admin' ? activeClass : inactiveClass}>System Admin</Link>}
                </div>

                <div className="flex items-center gap-6">
                    {/* ─── RIGHT SIDE CONTROLS ─── */}
                    <div className="flex items-center gap-5">
                                        
                                        {/* 1. User Profile */}
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Active Duty</p>
                                            <p className="text-white text-sm">{user?.username} <span className="text-amber-400 font-black tracking-tight">({user?.role})</span></p>
                                        </div>
                                        
                                        {/* 2. Sign Out Button */}
                                        <button onClick={logout} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded border border-red-500/30 transition-all text-xs font-black uppercase tracking-wider">
                                            Sign Out
                                        </button>

                                        {/* 3. Notification Bell (Moved & Isolated) */}
                                        {!isAdmin && user?.role !== 'CITIZEN' && (
                                            <div className="relative border-l border-slate-700 pl-5 flex items-center" ref={notifRef}>
                                                <button 
                                                    onClick={() => setIsNotifOpen(!isNotifOpen)} 
                                                    className="relative flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-amber-400 transition-all text-lg shadow-inner border border-slate-600"
                                                >
                                                    🔔
                                                    {unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)] border border-red-400">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </button>

                                                {/* Dropdown Menu */}
                                                {isNotifOpen && (
                                                    <div className="absolute right-0 top-full mt-4 w-80 sm:w-96 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden z-[100] flex flex-col max-h-[70vh] animate-in slide-in-from-top-2">
                                                        <div className="bg-slate-800 p-3 flex justify-between items-center border-b border-slate-700 shrink-0">
                                                            <span className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                                System Alerts
                                                            </span>
                                                            {unreadCount > 0 && (
                                                                <button onClick={markAllRead} className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase transition-colors">Mark All Read</button>
                                                            )}
                                                        </div>
                                                        <div className="overflow-y-auto flex-grow p-3 space-y-3 custom-scrollbar">
                                                            {notifications.length === 0 ? (
                                                                <p className="text-slate-500 text-xs text-center font-bold italic py-6">No new classified alerts.</p>
                                                            ) : (
                                                                notifications.map(n => (
                                                                    <div key={n.id} onClick={() => !n.is_read && markAsRead(n.id)} className={`p-4 rounded-lg border text-sm transition-all ${n.is_read ? 'bg-slate-800/30 border-slate-800 text-slate-500' : 'bg-slate-800 border-amber-500/50 text-slate-200 shadow-md cursor-pointer hover:border-amber-400'}`}>
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${n.notification_type.includes('REJECTED') ? 'bg-red-900/30 text-red-500 border border-red-500/20' : 'bg-amber-900/30 text-amber-500 border border-amber-500/20'}`}>
                                                                                {n.notification_type.replace(/_/g, ' ')}
                                                                            </span>
                                                                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,1)]"></span>}
                                                                        </div>
                                                                        <p className={`text-xs leading-relaxed ${n.is_read ? 'font-medium' : 'font-bold'}`}>{n.message}</p>
                                                                        <p className="text-[9px] text-slate-500 mt-3 font-mono border-t border-slate-700 pt-2">{new Date(n.created_at).toLocaleString()}</p>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                </div>
                </div>
            </div>
        </nav>
    );
}

// ─── SYSTEM FOOTER ───
function SystemFooter() {
    return (
        <footer className="bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80 p-2 shrink-0 z-50 text-[12px] font-mono text-slate-500 flex justify-between items-center px-6">
            <div className="flex gap-6">
                <span className="text-red-700 font-black tracking-widest uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    RESTRICTED GOVERNMENT NETWORK
                </span>
                <span className="hidden sm:inline border-l border-slate-800 pl-6">
                    Unauthorized access is a Class A Felony. All activities are monitored.
                </span>
            </div>
            
            <div className="flex gap-6 items-center">
                <span className="hidden md:inline">
                    Uplink: <span className="text-green-500 font-bold">SECURE (AES-256)</span>
                </span>
                <span className="hidden md:inline">NODE: BOI-CORE-09</span>
                <span className="text-slate-600 font-bold">
                    © 2026 Bureau of Investigation v2.4.1
                </span>
            </div>
        </footer>
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
        <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-x-hidden overflow-y-auto box-border relative">
            <div ref={vantaRef} className="absolute inset-0 z-0 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
                {token ? <NavLinks /> : <PublicHeader />}

                <main className="flex-grow overflow-x-hidden overflow-y-auto relative p-6">
                <Routes>
                        {/* If logged in, visiting '/' auto-redirects to workstation */}
                        <Route path="/" element={token ? <Navigate to={getDefaultRoute(user?.role)} replace /> : <HomePage />} />
                        <Route path="/most-wanted" element={<MostWantedPage />} />
                        <Route path="/auth" element={token ? <Navigate to={getDefaultRoute(user?.role)} replace /> : <AuthPage />} />
                        
                        {/* ─── WRAPPED IN UNIFORM CONTAINER ─── */}
                        <Route path="/admin" element={
                            <ProtectedRoute roles={['ADMIN']}>
                                <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">
                                    <AdminPanel />
                                </div>
                            </ProtectedRoute>
                        } />
                        
                        <Route path="/evidence" element={
                            <ProtectedRoute roles={['OFFICER', 'SERGEANT', 'DETECTIVE', 'CAPTAIN', 'CHIEF', 'JUDGE', 'CADET']}>
                                <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">  
                                    <EvidenceManager />
                                </div>
                            </ProtectedRoute>
                        } />
                        
                        <Route path="/coroner" element={
                            <ProtectedRoute roles={['DETECTIVE', 'CAPTAIN', 'CHIEF']}>
                                <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">  
                                    <CoronerPanel />
                                </div>
                            </ProtectedRoute>
                        } />
                        
                        <Route path="/finance" element={
                            <ProtectedRoute>
                                <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">    
                                    <FinanceDashboard />
                                </div>
                            </ProtectedRoute>
                        } />
                        
                        <Route path="/court" element={
                            <ProtectedRoute>
                                <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">   
                                    <CourtroomPanel />
                                </div>
                            </ProtectedRoute>
                        } />

                        <Route path="/active-board" element={
                            <ProtectedRoute>
                                <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">
                                    <ActiveCasesBoard />
                                </div>
                            </ProtectedRoute>
                        } />

                        <Route path="/cases" element={
                            <ProtectedRoute roles={['CITIZEN', 'CADET', 'OFFICER', 'PATROL_OFFICER', 'SERGEANT', 'DETECTIVE', 'CAPTAIN', 'CHIEF']}>
                                <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">
                                    <CaseManager />
                                </div>
                            </ProtectedRoute>
                        } />

                        {/* ─── FULL SCREEN / CUSTOM CONTAINERS ─── */}
                        <Route path="/payment-callback" element={<PaymentCallback />} />
                        <Route path="/investigation" element={<ProtectedRoute roles={['DETECTIVE', 'SERGEANT', 'CAPTAIN', 'CHIEF']}><InvestigationPanel /></ProtectedRoute>} />
                        
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                <SystemFooter />
            </div>
        </div>
    );
}

export default function App() {
    return <AuthProvider><Router><AppContent /></Router></AuthProvider>;
}