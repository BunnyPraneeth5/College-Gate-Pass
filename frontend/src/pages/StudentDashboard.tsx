import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { gatePassAPI } from '../api/client';
import type { GatePass } from '../api/client';
import QRCodeDisplay from '../components/QRCodeDisplay';

// Status pill colors
const statusStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-gray-100 text-gray-600 border-gray-200',
    used: 'bg-blue-100 text-blue-800 border-blue-200',
};

// Pass type badge colors
const passTypeStyles: Record<string, string> = {
    DAY_OUT: 'bg-sky-500',
    HOME_LEAVE: 'bg-indigo-500',
    EMERGENCY: 'bg-rose-500',
    NIGHT_OUT: 'bg-purple-500',
    LONG_LEAVE: 'bg-teal-500',
};

const passTypeLabels: Record<string, string> = {
    DAY_OUT: 'Day Out',
    HOME_LEAVE: 'Home Leave',
    EMERGENCY: 'Emergency',
    NIGHT_OUT: 'Night Out',
    LONG_LEAVE: 'Long Leave',
};

// Status icons
const statusIcons: Record<string, string> = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    expired: '⌛',
    used: '✔️',
};

export function StudentDashboard() {
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedQR, setExpandedQR] = useState<number | null>(null);

    useEffect(() => {
        fetchPasses();
    }, []);

    const fetchPasses = async () => {
        try {
            setIsLoading(true);
            const response = await gatePassAPI.list();
            setPasses(response.data);
        } catch (err: any) {
            setError('Failed to load gate passes');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const toggleQR = (passId: number) => {
        setExpandedQR(expandedQR === passId ? null : passId);
    };

    return (
        <Layout title="My Gate Passes">
            {/* Floating Action Button - New Pass */}
            <Link
                to="/student/create-pass"
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
            >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </Link>

            {/* Header Stats */}
            {!isLoading && passes.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                        <p className="text-2xl font-bold text-gray-800">{passes.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Total</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                            {passes.filter(p => p.status === 'pending').length}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Pending</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                        <p className="text-2xl font-bold text-emerald-600">
                            {passes.filter(p => p.status === 'approved').length}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Approved</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium">Loading passes...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-red-800">Error</p>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && passes.length === 0 && (
                <div className="text-center py-16 px-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Gate Passes Yet</h3>
                    <p className="text-gray-500 mb-6 max-w-xs mx-auto">
                        Tap the + button to request your first gate pass
                    </p>
                    <Link
                        to="/student/create-pass"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-md hover:shadow-lg"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Pass
                    </Link>
                </div>
            )}

            {/* Passes List */}
            {!isLoading && passes.length > 0 && (
                <div className="space-y-4 pb-20">
                    {passes.map((pass) => (
                        <div
                            key={pass.id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Card Header - Pass Type Badge */}
                            <div className={`${passTypeStyles[pass.pass_type] || 'bg-gray-500'} px-4 py-2 flex items-center justify-between`}>
                                <span className="text-white font-semibold text-sm">
                                    {passTypeLabels[pass.pass_type] || pass.pass_type}
                                </span>
                                <span className="text-white/80 text-xs">
                                    #{pass.id}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-4">
                                {/* Status Pill */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${statusStyles[pass.status]}`}>
                                        <span>{statusIcons[pass.status]}</span>
                                        <span className="capitalize">{pass.status}</span>
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {formatDate(pass.created_at)}
                                    </span>
                                </div>

                                {/* Reason */}
                                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                                    {pass.reason}
                                </p>

                                {/* Time Details */}
                                <div className="flex gap-4">
                                    {/* Out Time */}
                                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Out</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">{formatDate(pass.out_datetime)}</p>
                                        <p className="text-xs text-gray-500">{formatTime(pass.out_datetime)}</p>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>

                                    {/* In Time */}
                                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">In</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">{formatDate(pass.in_datetime)}</p>
                                        <p className="text-xs text-gray-500">{formatTime(pass.in_datetime)}</p>
                                    </div>
                                </div>

                                {/* QR Code for Approved Passes */}
                                {pass.status === 'approved' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => toggleQR(pass.id)}
                                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            </svg>
                                            {expandedQR === pass.id ? 'Hide QR Code' : 'Show QR Code'}
                                        </button>

                                        {expandedQR === pass.id && (
                                            <div className="mt-4 flex justify-center animate-fadeIn">
                                                <QRCodeDisplay gatePass={pass} size={180} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Approved By Info */}
                                {pass.approved_by && (
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            Approved by <span className="font-medium text-gray-700">{pass.approved_by.first_name} {pass.approved_by.last_name}</span>
                                        </span>
                                    </div>
                                )}

                                {/* Rejection Comment */}
                                {pass.status === 'rejected' && pass.approver_comment && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <div className="bg-red-50 rounded-lg p-3">
                                            <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
                                            <p className="text-sm text-red-700">{pass.approver_comment}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    );
}
