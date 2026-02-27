import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import EvidenceManager from './features/evidence/EvidenceManager';
import FinanceDashboard from './features/finance/FinanceDashboard';
import PaymentCallback from './features/finance/PaymentCallback';

// ─── TEMPORARY LOGIN PLACEHOLDER ───
// We will replace this with your actual Login form later!
function LoginPlaceholder() {
    return (
        <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg text-center border border-gray-200">
            <h2 className="text-2xl font-bold text-red-600 mb-2">🔒 Authentication Required</h2>
            <p className="text-gray-600 mb-6">You must be logged in to view the Finance Dashboard.</p>
            <p className="text-sm text-gray-400 italic">Axios successfully caught your 401 error and redirected you here!</p>
        </div>
    );
}

function NavLinks() {
    const location = useLocation();
    const activeClass = "bg-blue-800 text-white px-4 py-2 rounded-md transition-colors";
    const inactiveClass = "text-blue-200 hover:text-white hover:bg-blue-800 px-4 py-2 rounded-md transition-colors";

    return (
        <div className="max-w-4xl mx-auto flex gap-4 font-bold">
            <Link to="/" className={location.pathname === '/' ? activeClass : inactiveClass}>
                Evidence Panel
            </Link>
            <Link to="/finance" className={location.pathname === '/finance' ? activeClass : inactiveClass}>
                Finance Dashboard
            </Link>
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-100 font-sans">
                <nav className="bg-blue-900 shadow-md p-4">
                    <NavLinks />
                </nav>

                <div className="p-6">
                    <Routes>
                        <Route path="/" element={<EvidenceManager />} />
                        <Route path="/finance" element={<FinanceDashboard />} />
                        <Route path="/payment-callback" element={<PaymentCallback />} />
                        
                        {/* THE NEW ROUTE */}
                        <Route path="/login" element={<LoginPlaceholder />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}