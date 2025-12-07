import type { GatePass } from '../api/client';

interface GatePassCardProps {
    pass: GatePass;
    showStudent?: boolean;
    actions?: React.ReactNode;
}

export function GatePassCard({ pass, showStudent = false, actions }: GatePassCardProps) {
    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        expired: 'bg-gray-100 text-gray-800',
        used: 'bg-blue-100 text-blue-800',
    };

    const passTypeLabels: Record<string, string> = {
        DAY_OUT: 'Day Out',
        HOME_LEAVE: 'Home Leave',
        EMERGENCY: 'Emergency',
        NIGHT_OUT: 'Night Out',
        LONG_LEAVE: 'Long Leave',
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-5 mb-4 border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex-1 min-w-0">
                    <span className="inline-block px-3 py-1.5 text-sm font-bold rounded-lg bg-blue-100 text-blue-800">
                        {passTypeLabels[pass.pass_type] || pass.pass_type}
                    </span>
                    {showStudent && pass.student && (
                        <p className="text-base font-semibold mt-2 text-gray-800 truncate">
                            {pass.student.first_name} {pass.student.last_name}
                        </p>
                    )}
                </div>
                <span className={`px-3 py-1.5 text-sm font-bold rounded-lg capitalize whitespace-nowrap ${statusColors[pass.status]}`}>
                    {pass.status}
                </span>
            </div>

            {/* Details */}
            <div className="text-base text-gray-700 space-y-3">
                <div>
                    <p className="font-semibold text-gray-800 mb-1">Reason:</p>
                    <p className="text-gray-600">{pass.reason}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="font-semibold text-gray-800 text-sm mb-1">Out:</p>
                        <p className="text-sm text-gray-600">{formatDateTime(pass.out_datetime)}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 text-sm mb-1">In:</p>
                        <p className="text-sm text-gray-600">{formatDateTime(pass.in_datetime)}</p>
                    </div>
                </div>
                {pass.approved_by && (
                    <div>
                        <p className="font-semibold text-gray-800 text-sm mb-1">Approved by:</p>
                        <p className="text-sm text-gray-600">{pass.approved_by.first_name} {pass.approved_by.last_name}</p>
                    </div>
                )}
                {pass.approver_comment && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="font-semibold text-amber-800 text-sm mb-1">Comment:</p>
                        <p className="text-sm text-amber-700">{pass.approver_comment}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            {actions && (
                <div className="mt-5 pt-4 border-t-2 border-gray-200 flex gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
}
