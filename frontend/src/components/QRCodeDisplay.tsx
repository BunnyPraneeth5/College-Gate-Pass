import QRCode from 'react-qr-code';
import type { GatePass } from '../api/client';

interface QRCodeDisplayProps {
    gatePass: GatePass;
    size?: number;
}

export function QRCodeDisplay({ gatePass, size = 180 }: QRCodeDisplayProps) {
    if (gatePass.status !== 'approved') {
        return null;
    }

    return (
        <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-md">
            <div className="bg-white p-3 rounded-lg">
                <QRCode
                    value={gatePass.qr_token}
                    size={size}
                    level="H"
                    fgColor="#1e3a8a"
                />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
                Show this QR code at the gate
            </p>
            <p className="text-xs font-mono text-gray-400 mt-1">
                {gatePass.qr_token.slice(0, 8)}...
            </p>
        </div>
    );
}

export default QRCodeDisplay;
