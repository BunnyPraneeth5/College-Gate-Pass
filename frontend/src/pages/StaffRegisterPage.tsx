import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import type { StaffRegistrationData, Department } from '../api/client';

const DEPARTMENTS: Department[] = [
    { code: 'CSE', name: 'Computer Science & Engineering' },
    { code: 'CAI', name: 'Computer Science & AI' },
    { code: 'CSD', name: 'Computer Science & Data Science' },
    { code: 'EEE', name: 'Electrical & Electronics Engineering' },
    { code: 'ECE', name: 'Electronics & Communication Engineering' },
    { code: 'MEC', name: 'Mechanical Engineering' },
    { code: 'CIV', name: 'Civil Engineering' },
    { code: 'H&S', name: 'Humanities & Sciences' },
];

const STAFF_ROLES = [
    { value: 'faculty', label: 'Faculty' },
    { value: 'class_incharge', label: 'Class In-Charge' },
    { value: 'hod', label: 'Head of Department (HOD)' },
    { value: 'principal', label: 'Principal' },
];

export default function StaffRegisterPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<StaffRegistrationData>({
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        staff_role: 'faculty',
        department: '',
        phone: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters.');
            setIsLoading(false);
            return;
        }

        // Department required for non-principal roles
        if (formData.staff_role !== 'principal' && !formData.department) {
            setError('Department is required.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await authAPI.registerStaff(formData);
            localStorage.setItem('authToken', response.data.token);
            setSuccess(true);

            // Redirect based on role
            const role = response.data.user.role;
            const dashboardRoutes: Record<string, string> = {
                hod: '/hod/dashboard',
                principal: '/principal/dashboard',
                class_incharge: '/class-incharge/dashboard',
                faculty: '/faculty/dashboard',
            };

            setTimeout(() => {
                navigate(dashboardRoutes[role] || '/login');
            }, 1500);
        } catch (err: any) {
            const errorData = err.response?.data;
            if (errorData) {
                const messages: string[] = [];
                for (const key in errorData) {
                    const value = errorData[key];
                    if (Array.isArray(value)) {
                        messages.push(value.join(' '));
                    } else if (typeof value === 'string') {
                        messages.push(value);
                    }
                }
                setError(messages.join('\n') || 'Registration failed.');
            } else {
                setError('Network error. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-emerald-800 py-8 px-4">
            <div className="max-w-lg mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <Link to="/register" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4">
                            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Staff Registration</h1>
                        <p className="text-gray-600 mt-2">HOD, Faculty, Class In-Charge, Principal</p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="font-medium">Registration successful!</p>
                                <p className="text-sm">Redirecting to dashboard...</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            <div className="whitespace-pre-line">{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="your.email@college.edu"
                            />
                        </div>

                        {/* Role & Department */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                <select
                                    name="staff_role"
                                    value={formData.staff_role}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                >
                                    {STAFF_ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Department {formData.staff_role !== 'principal' ? '*' : ''}
                                </label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    required={formData.staff_role !== 'principal'}
                                    disabled={formData.staff_role === 'principal'}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-gray-100"
                                >
                                    <option value="">Select Department</option>
                                    {DEPARTMENTS.map(d => (
                                        <option key={d.code} value={d.code}>{d.name}</option>
                                    ))}
                                </select>
                                {formData.staff_role === 'principal' && (
                                    <p className="text-xs text-gray-500 mt-1">Principal manages all departments</p>
                                )}
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        {/* Passwords */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm *</label>
                                <input
                                    type="password"
                                    name="password_confirm"
                                    value={formData.password_confirm}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg"
                        >
                            {isLoading ? 'Registering...' : success ? '✓ Registered!' : 'Create Account'}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
