// Principal Dashboard - Same as HOD but with access to all departments
import { HodDashboard } from './HodDashboard';

export function PrincipalDashboard() {
    // Principal uses the same component as HOD
    // Backend handles department filtering
    return <HodDashboard />;
}
