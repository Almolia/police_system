import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CourtroomPanel from './features/legal/CourtroomPanel';
import * as THREE from 'three';
// @ts-ignore (Vanta doesn't have official TypeScript definitions yet)
import NET from 'vanta/dist/vanta.net.min';

import EvidenceManager from './features/evidence/EvidenceManager';
import FinanceDashboard from './features/finance/FinanceDashboard';
import PaymentCallback from './features/finance/PaymentCallback';

// ─── TEMPORARY LOGIN PLACEHOLDER ───
function LoginPlaceholder() {
    return (
        <div className="max-w-md mx-auto mt-20 p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-center border border-gray-200">
            <h2 className="text-2xl font-bold text-red-600 mb-2">🔒 Authentication Required</h2>
            <p className="text-gray-600 mb-6">You must be logged in to view this page.</p>
        </div>
    );
}

// ─── NAVIGATION BAR ───
function NavLinks() {
    const location = useLocation();
    // Adjusted colors slightly so they pop against the dark Vanta background
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
        </div>
    );
}

// ─── MAIN APP CONTENT ───
export default function App() {
    const vantaRef = useRef(null);

    // Initialize Vanta Background
    useEffect(() => {
      // ✅ Use a local variable instead
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

      // Cleanup function for when Vite hot-reloads
      return () => {
          if (effect) effect.destroy();
      };
    }, []); // 👈 Empty dependency array means it only sets up once

    return (
        <Router>
            {/* The Vanta Background Container */}
            <div ref={vantaRef} className="min-h-screen font-sans overflow-auto">
                
                {/* Global Navigation Bar (Made semi-transparent) */}
                <nav className="bg-blue-900/80 backdrop-blur-md shadow-md p-4 sticky top-0 z-50">
                    <NavLinks />
                </nav>

                {/* Page Routing */}
                <div className="p-6 relative z-10">
                    <Routes>
                        <Route path="/" element={<EvidenceManager />} />
                        <Route path="/finance" element={<FinanceDashboard />} />
                        <Route path="/payment-callback" element={<PaymentCallback />} />
                        <Route path="/login" element={<LoginPlaceholder />} />
                        <Route path="/court" element={<CourtroomPanel />} />
                    </Routes>
                </div>

            </div>
        </Router>
    );
}