import { QrCode } from 'lucide-react';

export default function QRBadge({ qrString }) {
  if (!qrString) return <span className="text-gray-400 text-xs italic">N/A</span>;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-gray-700 text-xs font-mono group cursor-pointer hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors">
      <QrCode size={12} className="group-hover:text-primary-600" />
      {qrString}
    </div>
  );
}
