import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CourtroomPanel from './features/legal/CourtroomPanel';
import * as THREE from 'three';
// @ts-ignore (Vanta doesn't have official TypeScript definitions yet)
import NET from 'vanta/dist/vanta.net.min';

import EvidenceManager from './features/evidence/EvidenceManager';
import FinanceDashboard from './features/finance/FinanceDashboard';
import PaymentCallback from './features/finance/PaymentCallback';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// ─── NAVIGATION BAR ───
function NavLinks() {
    const location = useLocation();
    const activeClass = "bg-blue-600 text-white px-4 py-2 rounded-md transition-colors shadow-lg";
    const inactiveClass = "text-blue-100 hover:text-white hover:bg-blue-600 px-4 py-2 rounded-md transition-colors";

    return (
        <div className="max-w-6xl mx-auto flex gap-4 font-bold">
            <Link to="/" className={location.pathname === '/' ? activeClass : inactiveClass}>
                Evidence Panel
            </Link>
            <Link to="/finance" className={location.pathname === '/finance' ? activeClass : inactiveClass}>
                Finance Dashboard
            </Link>
            <Link to="/court" className={location.pathname === '/court' ? activeClass : inactiveClass}>
                Courtroom
            </Link>
            <Link to="/login" className={location.pathname === '/login' ? activeClass : inactiveClass}>
                Login
            </Link>
        </div>
    );
}

// ─── MAIN APP CONTENT ───
export default function App() {
    const vantaRef = useRef(null);

    useEffect(() => {
        let effect: any = null;

        if (vantaRef.current) {
            effect = NET({
                el: vantaRef.current,
                THREE: THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                color: 0x4c4d89,
                backgroundColor: 0x170636,
                points: 9.00,
                maxDistance: 23.00,
                spacing: 17.00
            });
        }

        return () => {
            if (effect) effect.destroy();
        };
    }, []);

    return (
        <Router>
            <div ref={vantaRef} className="min-h-screen font-sans overflow-auto">

                {/* Global Navigation Bar */}
                <nav className="bg-blue-900/80 backdrop-blur-md shadow-md p-4 sticky top-0 z-50">
                    <NavLinks />
                </nav>

                {/* Page Routing */}
                <div className="p-6 relative z-10">
                    <Routes>
                        <Route path="/" element={<EvidenceManager />} />
                        <Route path="/finance" element={<FinanceDashboard />} />
                        <Route path="/payment-callback" element={<PaymentCallback />} />
                        <Route path="/court" element={<CourtroomPanel />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                    </Routes>
                </div>

            </div>
        </Router>
    );
}
