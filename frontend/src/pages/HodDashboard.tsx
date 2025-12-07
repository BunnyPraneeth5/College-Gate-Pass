import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { GatePassCard } from '../components/GatePassCard';
import { gatePassAPI, analyticsAPI, bulkUploadAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { GatePass, AnalyticsSummary } from '../api/client';

type TabType = 'approvals' | 'analytics' | 'upload';

export function HodDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('approvals');
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Only HOD, Principal, and Admin can see bulk upload
    const canBulkUpload = user && ['hod', 'principal', 'admin'].includes(user.role);

    useEffect(() => {
        if (activeTab === 'approvals') fetchPasses();
        if (activeTab === 'analytics') fetchAnalytics();
    }, [activeTab]);

    const fetchPasses = async () => {
        try {
            setIsLoading(true);
            const response = await gatePassAPI.list();
            const pendingPasses = response.data.filter((p: GatePass) => p.status === 'pending');
            setPasses(pendingPasses);
        } catch (err: any) {
            setError('Failed to load gate passes');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);
            const response = await analyticsAPI.getSummary();
            setAnalytics(response.data);
        } catch (err: any) {
            setError('Failed to load analytics');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            setActionLoading(id);
            await gatePassAPI.approve(id);
            setPasses((prev) => prev.filter((p) => p.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to approve pass');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: number) => {
        const comment = prompt('Enter rejection reason (optional):');
        try {
            setActionLoading(id);
            await gatePassAPI.reject(id, comment || '');
            setPasses((prev) => prev.filter((p) => p.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to reject pass');
        } finally {
            setActionLoading(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus(null);

        try {
            const response = await bulkUploadAPI.uploadUsers(file);
            setUploadStatus({
                success: true,
                message: `Upload successful! Created: ${response.data.summary.created}, Updated: ${response.data.summary.updated}, Errors: ${response.data.summary.errors}`
            });
        } catch (err: any) {
            setUploadStatus({
                success: false,
                message: err.response?.data?.error || 'Upload failed'
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const allTabs: { id: TabType; label: string; icon: string }[] = [
        { id: 'approvals', label: 'Approvals', icon: '📝' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
        { id: 'upload', label: 'Bulk Upload', icon: '📤' },
    ];

    // Filter tabs based on role
    const tabs = canBulkUpload ? allTabs : allTabs.filter(t => t.id !== 'upload');

    return (
        <Layout title="HOD Dashboard">
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

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
                <>
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!isLoading && passes.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No pending passes</h3>
                            <p className="mt-1 text-gray-500">All gate pass requests have been processed.</p>
                        </div>
                    )}

                    {!isLoading && passes.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 mb-2">{passes.length} pending request(s)</p>
                            {passes.map((pass) => (
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

                            {/* Passes by Department */}
                            {analytics.passes_per_department.length > 0 && (
                                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                    <h3 className="font-semibold text-gray-800 mb-4">Passes by Department</h3>
                                    <div className="space-y-3">
                                        {analytics.passes_per_department.map((item) => (
                                            <div key={item.department} className="flex items-center justify-between">
                                                <span className="text-gray-600">{item.department}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-indigo-600 h-2 rounded-full"
                                                            style={{ width: `${Math.min((item.count / analytics.summary.total) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-gray-800 font-medium w-8 text-right">{item.count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Top Students */}
                            {analytics.top_students.length > 0 && (
                                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                    <h3 className="font-semibold text-gray-800 mb-4">Top Students by Pass Count</h3>
                                    <div className="space-y-2">
                                        {analytics.top_students.slice(0, 5).map((student, idx) => (
                                            <div key={student.email} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm flex items-center justify-center font-medium">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-gray-800">{student.name}</p>
                                                        <p className="text-xs text-gray-500">{student.department}</p>
                                                    </div>
                                                </div>
                                                <span className="text-blue-600 font-semibold">{student.count} passes</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Bulk Upload Users</h3>
                    <p className="text-gray-600 mb-6">
                        Upload a CSV file with user data. The file should include columns:
                        <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-sm">
                            email, first_name, last_name, user_type, department, ...
                        </code>
                    </p>

                    {/* Upload Status */}
                    {uploadStatus && (
                        <div className={`mb-6 p-4 rounded-lg ${uploadStatus.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            {uploadStatus.message}
                        </div>
                    )}

                    {/* File Input */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mt-4 text-gray-600">
                                {isUploading ? 'Uploading...' : 'Click to upload CSV file'}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">CSV files only</p>
                        </label>
                    </div>

                    {/* CSV Template Info */}
                    <div className="mt-6 bg-blue-50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 mb-2">CSV Format</h4>
                        <p className="text-sm text-blue-700 mb-2">Required columns for students:</p>
                        <code className="text-xs bg-white px-2 py-1 rounded block overflow-x-auto">
                            email, first_name, last_name, user_type, department, roll_number, class_name, section, year, residency_type, parent_phone
                        </code>
                        <p className="text-xs text-blue-600 mt-2">user_type can be: student, faculty, class_incharge, hod, security</p>
                    </div>
                </div>
            )}
        </Layout>
    );
}
