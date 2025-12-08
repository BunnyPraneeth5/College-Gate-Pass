import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { GatePassCard } from '../components/GatePassCard';
import { gatePassAPI, analyticsAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { GatePass, AnalyticsSummary } from '../api/client';

type TabType = 'approvals' | 'all_passes' | 'analytics';

export function ClassInchargeDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('approvals');
    const [pendingPasses, setPendingPasses] = useState<GatePass[]>([]);
    const [allPasses, setAllPasses] = useState<GatePass[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    useEffect(() => {
        if (activeTab === 'approvals') fetchPendingPasses();
        if (activeTab === 'all_passes') fetchAllPasses();
        if (activeTab === 'analytics') fetchAnalytics();
    }, [activeTab]);

    const fetchPendingPasses = async () => {
        try {
            setIsLoading(true);
            setError('');
            // Class Incharge can only see EMERGENCY passes in pending
            const response = await gatePassAPI.pending();
            // Filter for emergency passes only (backend should already filter, but ensure client-side)
            const emergencyPasses = response.data.filter((p: GatePass) => p.pass_type === 'EMERGENCY');
            setPendingPasses(emergencyPasses);
        } catch (err: any) {
            console.error('Dashboard error:', err);
            if (err.response?.status === 403) {
                setError('You do not have permission to view pending approvals.');
            } else {
                setError(err.response?.data?.error || 'Failed to load pending passes');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllPasses = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await gatePassAPI.list();
            setAllPasses(response.data);
        } catch (err: any) {
            console.error('Dashboard error:', err);
            setError(err.response?.data?.error || 'Failed to load gate passes');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await analyticsAPI.getSummary({ department: user?.department });
            setAnalytics(response.data);
        } catch (err: any) {
            console.error('Analytics error:', err);
            setError(err.response?.data?.error || 'Failed to load analytics');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            setActionLoading(id);
            setError('');
            await gatePassAPI.approve(id);
            setPendingPasses((prev) => prev.filter((p) => p.id !== id));
        } catch (err: any) {
            if (err.response?.status === 403) {
                setError('Class Incharge can only approve EMERGENCY passes.');
            } else {
                alert(err.response?.data?.error || 'Failed to approve pass');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: number) => {
        const comment = prompt('Enter rejection reason (optional):');
        try {
            setActionLoading(id);
            setError('');
            await gatePassAPI.reject(id, comment || '');
            setPendingPasses((prev) => prev.filter((p) => p.id !== id));
        } catch (err: any) {
            if (err.response?.status === 403) {
                setError('Class Incharge can only reject EMERGENCY passes.');
            } else {
                alert(err.response?.data?.error || 'Failed to reject pass');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: 'approvals', label: 'Emergency Approvals', icon: '🚨' },
        { id: 'all_passes', label: 'All Passes', icon: '📋' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
    ];

    return (
        <Layout title="Class Incharge Dashboard">
            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🚨</span>
                    <div>
                        <p className="text-amber-800 font-semibold">Emergency Pass Approvals</p>
                        <p className="text-amber-700 text-sm mt-1">
                            As Class Incharge, you can approve/reject <strong>EMERGENCY</strong> passes only.
                            Regular passes require HOD or Principal approval.
                        </p>
                        {user?.department && (
                            <p className="text-amber-600 text-xs mt-2">
                                Department: <span className="font-medium">{user.department}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setError(''); }}
                        className={`flex-shrink-0 px-4 py-3 rounded-xl font-semibold transition-colors ${activeTab === tab.id
                            ? 'bg-rose-600 text-white shadow-lg'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Approvals Tab (Emergency Only) */}
            {activeTab === 'approvals' && (
                <>
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                        </div>
                    )}

                    {!isLoading && pendingPasses.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No pending emergency passes</h3>
                            <p className="mt-1 text-gray-500">All emergency gate pass requests have been processed.</p>
                        </div>
                    )}

                    {!isLoading && pendingPasses.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 mb-2">
                                <span className="text-rose-600 font-semibold">{pendingPasses.length}</span> emergency request(s) pending
                            </p>
                            {pendingPasses.map((pass) => (
                                <GatePassCard
                                    key={pass.id}
                                    pass={pass}
                                    showStudent
                                    actions={
                                        <>
                                            <button
                                                onClick={() => handleApprove(pass.id)}
                                                disabled={actionLoading === pass.id}
                                                className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white text-base font-bold rounded-xl transition-colors disabled:opacity-50 shadow-md"
                                            >
                                                {actionLoading === pass.id ? '⏳' : '✓'} Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(pass.id)}
                                                disabled={actionLoading === pass.id}
                                                className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white text-base font-bold rounded-xl transition-colors disabled:opacity-50 shadow-md"
                                            >
                                                {actionLoading === pass.id ? '⏳' : '✕'} Reject
                                            </button>
                                        </>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* All Passes Tab (View Only) */}
            {activeTab === 'all_passes' && (
                <>
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!isLoading && allPasses.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No gate passes</h3>
                            <p className="mt-1 text-gray-500">No gate passes found in your department.</p>
                        </div>
                    )}

                    {!isLoading && allPasses.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 mb-2">{allPasses.length} total pass(es)</p>
                            {allPasses.map((pass) => (
                                <GatePassCard
                                    key={pass.id}
                                    pass={pass}
                                    showStudent
                                    actions={
                                        pass.pass_type !== 'EMERGENCY' && pass.status === 'pending' ? (
                                            <div className="w-full text-center text-amber-600 font-medium py-2 bg-amber-50 rounded-lg text-sm">
                                                ⏳ Requires HOD/Principal Approval
                                            </div>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <>
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!isLoading && analytics && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                                    <p className="text-3xl font-bold text-gray-800">{analytics.summary.total}</p>
                                    <p className="text-sm text-gray-500">Total Passes</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                                    <p className="text-3xl font-bold text-amber-600">{analytics.summary.pending}</p>
                                    <p className="text-sm text-gray-500">Pending</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                                    <p className="text-3xl font-bold text-green-600">{analytics.summary.approved}</p>
                                    <p className="text-sm text-gray-500">Approved</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                                    <p className="text-3xl font-bold text-blue-600">{analytics.summary.approval_rate}%</p>
                                    <p className="text-sm text-gray-500">Approval Rate</p>
                                </div>
                            </div>

                            {/* Passes by Type */}
                            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-4">Passes by Type</h3>
                                <div className="space-y-3">
                                    {analytics.passes_per_type.map((item) => (
                                        <div key={item.pass_type} className="flex items-center justify-between">
                                            <span className={`capitalize ${item.pass_type === 'EMERGENCY' ? 'text-rose-600 font-semibold' : 'text-gray-600'}`}>
                                                {item.pass_type.replace('_', ' ')}
                                                {item.pass_type === 'EMERGENCY' && ' (You can approve)'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${item.pass_type === 'EMERGENCY' ? 'bg-rose-500' : 'bg-blue-600'}`}
                                                        style={{ width: `${Math.min((item.count / analytics.summary.total) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-gray-800 font-medium w-8 text-right">{item.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Layout>
    );
}
