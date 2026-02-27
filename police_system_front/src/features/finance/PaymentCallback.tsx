import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function PaymentCallback() {
    const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [message, setMessage] = useState('Verifying your payment with the bank...');
    const [refId, setRefId] = useState('');

    useEffect(() => {
        // Read the ZarinPal parameters directly from the browser URL
        const urlParams = new URLSearchParams(window.location.search);
        const authority = urlParams.get('Authority');
        const paymentStatus = urlParams.get('Status');

        if (!authority || !paymentStatus) {
            setStatus('ERROR');
            setMessage('Invalid return link. Missing bank parameters.');
            return;
        }

        const verifyPayment = async () => {
            try {
                const response = await api.get('/finance/payments/callback/', {
                    params: {
                        Authority: authority,
                        Status: paymentStatus
                    }
                });
                
                setStatus('SUCCESS');
                setMessage(response.data.message || 'Payment verified successfully!');
                setRefId(response.data.ref_id);
            } catch (error: any) {
                setStatus('ERROR');
                // The error message from backend will now properly show up
                setMessage(error.response?.data?.error || 'Payment failed or was cancelled.');
            }
        };

        verifyPayment();
    }, []);

    return (
        <div className="max-w-md mx-auto p-8 mt-20 bg-white border border-gray-200 rounded-xl shadow-2xl text-center font-sans">
            {status === 'LOADING' && (
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    <h2 className="text-xl font-bold text-gray-700">{message}</h2>
                    <p className="text-gray-500">Please do not close this window.</p>
                </div>
            )}

            {status === 'SUCCESS' && (
                <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <span className="text-3xl">✅</span>
                    </div>
                    <h2 className="text-2xl font-black text-green-700">Payment Successful</h2>
                    <p className="text-gray-600">{message}</p>
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded w-full">
                        <p className="text-sm text-gray-500 uppercase font-bold">Bank Reference ID</p>
                        <p className="text-lg font-mono text-gray-800 tracking-wider">{refId || 'N/A'}</p>
                    </div>
                    <button onClick={() => window.location.href = '/'} className="mt-6 w-full py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 transition-colors">
                        Return to Dashboard
                    </button>
                </div>
            )}

            {status === 'ERROR' && (
                <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h2 className="text-2xl font-black text-red-700">Transaction Failed</h2>
                    <p className="text-gray-700 font-medium">{message}</p>
                    <button onClick={() => window.location.href = '/'} className="mt-6 w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}