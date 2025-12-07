import { useState, useEffect, useCallback } from 'react';
import { gatePassAPI } from '../api/client';
import type { GatePass } from '../api/client';

export function useGatePasses(filterPending = false) {
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPasses = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await gatePassAPI.list();
            const data = filterPending 
                ? response.data.filter((p: GatePass) => p.status === 'pending')
                : response.data;
            setPasses(data);
        } catch (err: any) {
            setError('Failed to load gate passes');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [filterPending]);

    useEffect(() => {
        fetchPasses();
    }, [fetchPasses]);

    return { passes, setPasses, isLoading, error, refetch: fetchPasses };
}
