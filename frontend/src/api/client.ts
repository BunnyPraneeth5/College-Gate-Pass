import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Token ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
        }
        return Promise.reject(error);
    }
);

export default apiClient;

// ==================== Types ====================

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'faculty' | 'class_incharge' | 'hod' | 'principal' | 'security' | 'admin';
    department: string;
    student_profile?: StudentProfile;
}

export interface StudentProfile {
    id: number;
    roll_number: string;
    class_name: string;
    section: string;
    year: number;
    residency_type: 'DAY_SCHOLAR' | 'HOSTELLER';
    parent_phone: string;
    parent_email?: string;
    address: string;
}

export interface GateLog {
    id: number;
    action: 'OUT' | 'IN';
    timestamp: string;
    marked_by: User | null;
    notes: string;
}

export interface GatePass {
    id: number;
    student: User;
    pass_type: 'DAY_OUT' | 'HOME_LEAVE' | 'EMERGENCY' | 'NIGHT_OUT' | 'LONG_LEAVE';
    reason: string;
    out_datetime: string;
    in_datetime: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'used';
    approved_by: User | null;
    approver_comment: string;
    qr_token: string;
    created_at: string;
    logs?: GateLog[];
}

export interface Department {
    code: string;
    name: string;
}

export interface ClassAssignment {
    id: number;
    incharge: number;
    incharge_name: string;
    incharge_email: string;
    department: string;
    year: number;
    section: string;
    semester: number;
    academic_year: string;
    active: boolean;
}

export interface AttendanceRecord {
    id: number;
    date: string;
    department: string;
    year: number;
    section: string;
    uploaded_by_name: string;
    upload_time: string;
    is_late: boolean;
    total_students: number;
    present_count: number;
    absent_count: number;
}

export interface AttendanceStatus {
    department: string;
    year: number;
    section: string;
    uploaded: boolean;
    is_late?: boolean;
    upload_time?: string;
}

export interface AnalyticsSummary {
    date_range: { from: string; to: string };
    department?: string;
    summary: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        used: number;
        approval_rate: number;
    };
    passes_per_day: { date: string; count: number }[];
    passes_per_department: { department: string; count: number }[];
    passes_per_type: { pass_type: string; count: number }[];
    top_students: { name: string; email: string; department: string; count: number }[];
}

// Registration types
export interface StudentRegistrationData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    department: string;
    phone?: string;
    roll_number: string;
    class_name: string;
    section: string;
    year: number;
    residency_type: 'DAY_SCHOLAR' | 'HOSTELLER';
    parent_phone: string;
    parent_email?: string;
    address?: string;
}

export interface StaffRegistrationData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    staff_role: 'faculty' | 'class_incharge' | 'hod' | 'principal';
    department: string;
    phone?: string;
}

export interface SecurityRegistrationData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    phone?: string;
    gate_location?: string;
}

export interface LoginResponse {
    message: string;
    user: User;
    token: string;
}

export interface GatePassCreateData {
    pass_type: string;
    reason: string;
    out_datetime: string;
    in_datetime: string;
}

export interface BulkUploadResult {
    message: string;
    summary: {
        created: number;
        updated: number;
        errors: number;
    };
    details: {
        created: any[];
        updated: any[];
        errors: any[];
    };
}

// ==================== API Functions ====================

export const authAPI = {
    login: (email: string, password: string) =>
        apiClient.post<LoginResponse>('/api/auth/login/', { email, password }),

    getProfile: () =>
        apiClient.get<User>('/api/auth/profile/'),

    logout: () =>
        apiClient.post('/api/auth/logout/'),

    // Registration endpoints
    registerStudent: (data: StudentRegistrationData) =>
        apiClient.post<LoginResponse>('/api/auth/register/student/', data),

    registerStaff: (data: StaffRegistrationData) =>
        apiClient.post<LoginResponse>('/api/auth/register/staff/', data),

    registerSecurity: (data: SecurityRegistrationData) =>
        apiClient.post<LoginResponse>('/api/auth/register/security/', data),

    // Departments
    getDepartments: () =>
        apiClient.get<{ departments: Department[] }>('/api/departments/'),
};

export const gatePassAPI = {
    list: (params?: { status?: string; pass_type?: string }) =>
        apiClient.get<GatePass[]>('/api/gate-pass/list/', { params }),

    pending: () =>
        apiClient.get<GatePass[]>('/api/gate-pass/pending/'),

    create: (data: GatePassCreateData) =>
        apiClient.post('/api/gate-pass/', data),

    getById: (id: number) =>
        apiClient.get<GatePass>(`/api/gate-pass/${id}/`),

    approve: (id: number, comment?: string) =>
        apiClient.post(`/api/gate-pass/${id}/approve/`, { comment: comment || '' }),

    reject: (id: number, comment?: string) =>
        apiClient.post(`/api/gate-pass/${id}/reject/`, { comment: comment || '' }),

    markOut: (id: number, notes?: string) =>
        apiClient.post(`/api/gate-pass/${id}/mark-out/`, { notes: notes || '' }),

    markIn: (id: number, notes?: string) =>
        apiClient.post(`/api/gate-pass/${id}/mark-in/`, { notes: notes || '' }),

    scanByToken: (token: string) =>
        apiClient.get<{ gate_pass: GatePass }>(`/api/gate-pass/scan/?token=${token}`),
};

export const classAssignmentAPI = {
    list: (params?: { department?: string; year?: number; active?: boolean }) =>
        apiClient.get<ClassAssignment[]>('/api/class-assignments/', { params }),

    create: (data: Partial<ClassAssignment>) =>
        apiClient.post<ClassAssignment>('/api/class-assignments/', data),

    update: (id: number, data: Partial<ClassAssignment>) =>
        apiClient.patch<ClassAssignment>(`/api/class-assignments/${id}/`, data),

    delete: (id: number) =>
        apiClient.delete(`/api/class-assignments/${id}/`),
};

export const bulkUploadAPI = {
    uploadUsers: (file: File, type?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (type) formData.append('type', type);
        return apiClient.post<BulkUploadResult>('/api/bulk-upload/users/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    uploadStudents: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post<BulkUploadResult>('/api/auth/students/upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
};

export const attendanceAPI = {
    upload: (data: {
        date: string;
        department: string;
        year: number;
        section: string;
        entries?: { roll_number: string; present: boolean }[];
        file?: File;
    }) => {
        if (data.file) {
            const formData = new FormData();
            formData.append('date', data.date);
            formData.append('department', data.department);
            formData.append('year', String(data.year));
            formData.append('section', data.section);
            formData.append('file', data.file);
            return apiClient.post('/api/attendance/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return apiClient.post('/api/attendance/upload/', data);
    },

    getStatus: (date?: string) =>
        apiClient.get<{
            date: string;
            summary: { total_classes: number; uploaded: number; pending: number; late_uploads: number };
            classes: AttendanceStatus[];
        }>('/api/attendance/status/', { params: { date } }),

    listRecords: (params?: { date?: string; department?: string; year?: number }) =>
        apiClient.get<AttendanceRecord[]>('/api/attendance/records/', { params }),
};

export const analyticsAPI = {
    getSummary: (params?: { from?: string; to?: string; department?: string }) =>
        apiClient.get<AnalyticsSummary>('/api/analytics/summary/', { params }),

    getDepartmentStats: (department: string) =>
        apiClient.get<{
            department: string;
            students: number;
            staff: number;
            passes: { total: number; this_month: number; pending: number };
        }>(`/api/analytics/department/${department}/`),
};

export const userAPI = {
    list: (params?: { role?: string; department?: string; search?: string }) =>
        apiClient.get<User[]>('/api/users/', { params }),
};
