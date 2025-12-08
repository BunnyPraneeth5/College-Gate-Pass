import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { GatePassCard } from '../components/GatePassCard';
import { gatePassAPI, analyticsAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { GatePass, AnalyticsSummary } from '../api/client';

type TabType = 'passes' | 'analytics';

export function FacultyDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('passes');
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (activeTab === 'passes') fetchPasses();
        if (activeTab === 'analytics') fetchAnalytics();
    }, [activeTab]);

    const fetchPasses = async () => {
        try {
            setIsLoading(true);
            setError('');
            // Faculty can view all passes from their department (view-only)
            const response = await gatePassAPI.list();
            setPasses(response.data);
        } catch (err: any) {
            console.error('Faculty dashboard error:', err);
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

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: 'passes', label: 'Gate Passes', icon: '📋' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
    ];

    // Group passes by status for display
    const pendingPasses = passes.filter(p => p.status === 'pending');
    const approvedPasses = passes.filter(p => p.status === 'approved');
    const otherPasses = passes.filter(p => !['pending', 'approved'].includes(p.status));

    return (
        <Layout title="Faculty Dashboard">
            {/* Department Info */}
            {user?.department && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-blue-800 text-sm">
                        <span className="font-semibold">Department:</span> {user.department}
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                        View-only access to student gate passes
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setError(''); }}
                        className={`flex-shrink-0 px-4 py-3 rounded-xl font-semibold transition-colors ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg'
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

            {/* Passes Tab (View Only) */}
            {activeTab === 'passes' && (
                <>
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!isLoading && passes.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No gate passes</h3>
                            <p className="mt-1 text-gray-500">No gate passes found in your department.</p>
                        </div>
                    )}

                    {!isLoading && passes.length > 0 && (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                                    <p className="text-2xl font-bold text-amber-600">{pendingPasses.length}</p>
                                    <p className="text-xs text-gray-500">Pending</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                                    <p className="text-2xl font-bold text-green-600">{approvedPasses.length}</p>
                                    <p className="text-xs text-gray-500">Approved</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                                    <p className="text-2xl font-bold text-gray-600">{otherPasses.length}</p>
                                    <p className="text-xs text-gray-500">Other</p>
                                </div>
                            </div>

                            {/* Pending Passes */}
                            {pendingPasses.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                        Pending Approval ({pendingPasses.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {pendingPasses.map((pass) => (
                                            <GatePassCard
                                                key={pass.id}
                                                pass={pass}
                                                showStudent
                                                actions={
                                                    <div className="w-full text-center text-amber-600 font-medium py-2 bg-amber-50 rounded-lg">
                                                        ⏳ Awaiting Approval (HOD/Principal Only)
                                                    </div>
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Approved Passes */}
                            {approvedPasses.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                        Approved ({approvedPasses.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {approvedPasses.map((pass) => (
                                            <GatePassCard
                                                key={pass.id}
                                                pass={pass}
                                                showStudent
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Other Passes */}
                            {otherPasses.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                                        Other ({otherPasses.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {otherPasses.map((pass) => (
                                            <GatePassCard
                                                key={pass.id}
                                                pass={pass}
                                                showStudent
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
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
                                            <span className="text-gray-600 capitalize">{item.pass_type.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full"
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
