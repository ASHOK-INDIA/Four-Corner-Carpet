import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';

interface Tender {
  id: string;
  buyer: string;
  rfqNo: string;
  project: string;
  deadline: string;
  status: 'Open' | 'Closed' | 'Awarded';
  link: string;
}

interface TenderRfqTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TenderRfqTrackerModal: React.FC<TenderRfqTrackerModalProps> = ({ isOpen, onClose }) => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tenders/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        setTenders(data.tenders);
      }
    } catch (error) {
      console.error('Failed to fetch tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchTenders();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Live Tender / RFQ Tracker
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={fetchTenders} className="p-2 hover:bg-slate-200 rounded-lg transition" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-20 text-slate-400">Fetching live tenders...</div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Buyer</th>
                  <th className="p-3">RFQ No</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Deadline</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenders.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{t.buyer}</td>
                    <td className="p-3 font-mono">{t.rfqNo}</td>
                    <td className="p-3 text-slate-700">{t.project}</td>
                    <td className="p-3 text-slate-500">{t.deadline}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${t.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-[#E4002B] hover:text-rose-800 flex items-center gap-1 font-bold">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
