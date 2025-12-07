// Gate Pass Status Styles
export const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-gray-100 text-gray-600 border-gray-200',
    used: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const PASS_TYPE_STYLES: Record<string, string> = {
    DAY_OUT: 'bg-sky-500',
    HOME_LEAVE: 'bg-indigo-500',
    EMERGENCY: 'bg-rose-500',
    NIGHT_OUT: 'bg-purple-500',
    LONG_LEAVE: 'bg-teal-500',
};

export const PASS_TYPE_LABELS: Record<string, string> = {
    DAY_OUT: 'Day Out',
    HOME_LEAVE: 'Home Leave',
    EMERGENCY: 'Emergency',
    NIGHT_OUT: 'Night Out',
    LONG_LEAVE: 'Long Leave',
};

export const STATUS_ICONS: Record<string, string> = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    expired: '⌛',
    used: '✔️',
};
