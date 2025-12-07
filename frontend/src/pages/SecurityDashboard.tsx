import { useState } from 'react';
import { Layout } from '../components/Layout';
import { GatePassCard } from '../components/GatePassCard';
import { QRScanner } from '../components/QRScanner';
import apiClient, { gatePassAPI } from '../api/client';
import type { GatePass, GateLog } from '../api/client';

export function SecurityDashboard() {
    const [passId, setPassId] = useState('');
    const [pass, setPass] = useState<GatePass | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<'out' | 'in' | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [showScanner, setShowScanner] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        await searchByPassId(passId);
    };

    const searchByPassId = async (id: string) => {
        setError('');
        setPass(null);
        setSuccessMessage('');

        if (!id.trim()) {
            setError('Please enter a Pass ID');
            return;
        }

        try {
            setIsLoading(true);
            const response = await apiClient.get(`/api/gate-pass/${id}/`);
            setPass(response.data);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('Gate pass not found');
            } else {
                setError(err.response?.data?.error || 'Failed to fetch gate pass');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleQRScan = async (qrToken: string) => {
        setError('');
        setPass(null);
        setSuccessMessage('');
        setShowScanner(false);

        try {
            setIsLoading(true);
            const response = await gatePassAPI.scanByToken(qrToken);
            setPass(response.data.gate_pass);
            setSuccessMessage('QR code scanned successfully!');
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('Invalid QR code');
            } else {
                setError(err.response?.data?.error || 'Failed to scan QR code');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkOut = async () => {
        if (!pass) return;

        try {
            setActionLoading('out');
            setError('');
            const response = await gatePassAPI.markOut(pass.id);
            setPass(response.data.gate_pass);
            setSuccessMessage('Exit marked successfully!');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to mark exit');
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkIn = async () => {
        if (!pass) return;

        try {
            setActionLoading('in');
            setError('');
            const response = await gatePassAPI.markIn(pass.id);
            setPass(response.data.gate_pass);
            setSuccessMessage('Entry marked successfully! Gate pass completed.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to mark entry');
        } finally {
            setActionLoading(null);
        }
    };

    const hasExited = pass?.status === 'approved' && pass.logs?.some((l: GateLog) => l.action === 'OUT');
    const hasReturned = pass?.status === 'used';

    return (
        <Layout title="Security Gate">
            <div className="max-w-lg mx-auto">
                {/* Toggle Buttons */}
                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => setShowScanner(false)}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${!showScanner ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        📝 Manual Entry
                    </button>
                    <button
                        onClick={() => setShowScanner(true)}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${showScanner ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        📷 Scan QR
                    </button>
                </div>

                {/* QR Scanner */}
                {showScanner && (
                    <QRScanner
                        onScanSuccess={handleQRScan}
                        onScanError={(err) => setError(err)}
                    />
                )}

                {/* Manual Search Form */}
                {!showScanner && (
                    <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Enter Pass ID</h2>

                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={passId}
                                onChange={(e) => setPassId(e.target.value)}
                                placeholder="Enter Pass ID"
                                className="flex-1 px-4 py-4 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg whitespace-nowrap"
                            >
                                {isLoading ? '⏳ Searching...' : '🔍 Search'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Pass Details */}
                {pass && !isLoading && (
                    <div>
                        <GatePassCard
                            pass={pass}
                            showStudent
                            actions={
                                pass.status === 'approved' ? (
                                    <>
                                        {!hasExited && (
                                            <button
                                                onClick={handleMarkOut}
                                                disabled={actionLoading !== null}
                                                className="w-full px-6 py-5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-lg font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg"
                                            >
                                                {actionLoading === 'out' ? '⏳ Marking...' : '🚶 Mark EXIT'}
                                            </button>
                                        )}
                                        {hasExited && !hasReturned && (
                                            <button
                                                onClick={handleMarkIn}
                                                disabled={actionLoading !== null}
                                                className="w-full px-6 py-5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-lg font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg"
                                            >
                                                {actionLoading === 'in' ? '⏳ Marking...' : '✅ Mark ENTRY'}
                                            </button>
                                        )}
                                    </>
                                ) : pass.status === 'used' ? (
                                    <div className="w-full text-center text-green-600 font-medium py-2">
                                        ✅ Pass Completed
                                    </div>
                                ) : pass.status === 'pending' ? (
                                    <div className="w-full text-center text-yellow-600 font-medium py-2">
                                        ⏳ Awaiting Approval
                                    </div>
                                ) : (
                                    <div className="w-full text-center text-gray-500 font-medium py-2">
                                        Pass is {pass.status}
                                    </div>
                                )
                            }
                        />

                        {/* Student Info Box */}
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <h3 className="font-semibold text-blue-800 mb-2">Student Information</h3>
                            <div className="text-sm text-blue-700 space-y-1">
                                <p><strong>Name:</strong> {pass.student.first_name} {pass.student.last_name}</p>
                                <p><strong>Department:</strong> {pass.student.department}</p>
                                <p><strong>Status:</strong> <span className="capitalize font-medium">{pass.status}</span></p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
