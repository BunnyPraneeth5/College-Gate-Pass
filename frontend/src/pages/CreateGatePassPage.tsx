import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { gatePassAPI } from '../api/client';

const PASS_TYPES = [
    { value: 'DAY_OUT', label: 'Day Out' },
    { value: 'HOME_LEAVE', label: 'Home Leave' },
    { value: 'EMERGENCY', label: 'Emergency' },
    { value: 'NIGHT_OUT', label: 'Night Out' },
    { value: 'LONG_LEAVE', label: 'Long Leave' },
];

export function CreateGatePassPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        pass_type: 'DAY_OUT',
        reason: '',
        out_datetime: '',
        in_datetime: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(''); // Clear error on input change
    };

    const formatFieldName = (field: string): string => {
        const fieldNames: Record<string, string> = {
            pass_type: 'Pass Type',
            reason: 'Reason',
            out_datetime: 'Out Date & Time',
            in_datetime: 'Return Date & Time',
            non_field_errors: '',
        };
        return fieldNames[field] || field;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Client-side validation
        const outDate = new Date(formData.out_datetime);
        const inDate = new Date(formData.in_datetime);

        if (inDate <= outDate) {
            setError('Return time must be after out time.');
            return;
        }

        if (outDate < new Date()) {
            setError('Out time must be in the future.');
            return;
        }

        setIsLoading(true);

        try {
            const data = {
                pass_type: formData.pass_type,
                reason: formData.reason.trim(),
                out_datetime: outDate.toISOString(),
                in_datetime: inDate.toISOString(),
            };

            await gatePassAPI.create(data);
            setSuccess(true);
            
            // Redirect after showing success message
            setTimeout(() => {
                navigate('/student/dashboard');
            }, 1500);
        } catch (err: any) {
            const errorData = err.response?.data;
            if (errorData) {
                const messages: string[] = [];
                for (const key in errorData) {
                    const value = errorData[key];
                    const fieldLabel = formatFieldName(key);
                    
                    if (Array.isArray(value)) {
                        const errorMsg = value.join(', ');
                        messages.push(fieldLabel ? `${fieldLabel}: ${errorMsg}` : errorMsg);
                    } else if (typeof value === 'string') {
                        messages.push(fieldLabel ? `${fieldLabel}: ${value}` : value);
                    }
                }
                setError(messages.join('\n') || 'Failed to create gate pass.');
            } else {
                setError('Network error. Please check your connection and try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout title="Create Gate Pass">
            <div className="max-w-lg mx-auto px-4 sm:px-0">
                <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6">
                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="font-medium">Gate pass created successfully!</p>
                                <p className="text-sm">Redirecting to dashboard...</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm whitespace-pre-line">{error}</div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Pass Type */}
                        <div>
                            <label htmlFor="pass_type" className="block text-base font-semibold text-gray-700 mb-2">
                                Pass Type
                            </label>
                            <select
                                id="pass_type"
                                name="pass_type"
                                value={formData.pass_type}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                {PASS_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reason */}
                        <div>
                            <label htmlFor="reason" className="block text-base font-semibold text-gray-700 mb-2">
                                Reason
                            </label>
                            <textarea
                                id="reason"
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                required
                                rows={4}
                                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                placeholder="Enter the reason for your gate pass..."
                            />
                        </div>

                        {/* Out DateTime */}
                        <div>
                            <label htmlFor="out_datetime" className="block text-base font-semibold text-gray-700 mb-2">
                                Out Date & Time
                            </label>
                            <input
                                id="out_datetime"
                                type="datetime-local"
                                name="out_datetime"
                                value={formData.out_datetime}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* In DateTime */}
                        <div>
                            <label htmlFor="in_datetime" className="block text-base font-semibold text-gray-700 mb-2">
                                Return Date & Time
                            </label>
                            <input
                                id="in_datetime"
                                type="datetime-local"
                                name="in_datetime"
                                value={formData.in_datetime}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/student/dashboard')}
                                className="sm:flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 text-base font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || success}
                                className="sm:flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating...
                                    </span>
                                ) : success ? (
                                    '✓ Created'
                                ) : (
                                    'Create Pass'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
