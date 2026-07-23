import React from 'react';
import { Kanban, Key, RefreshCw, FolderGit2 } from 'lucide-react';

interface HeaderNavProps {
  projectName: string;
  projectKey: string;
  viewLabel: string;
  connectionState: 'idle' | 'testing' | 'connected' | 'failed';
  scanState: 'idle' | 'scanning' | 'succeeded' | 'failed';
  onOpenCredential: () => void;
  onScan: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  projectName,
  projectKey,
  viewLabel,
  connectionState,
  scanState,
  onOpenCredential,
  onScan
}) => {
  const statusColorMap = {
    connected: 'bg-emerald-500 text-white',
    testing: 'bg-amber-500 text-white animate-pulse',
    failed: 'bg-red-500 text-white',
    idle: 'bg-slate-400 text-white'
  };
  const isScanning = scanState === 'scanning';

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left: Breadcrumb & Title */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
          <span className="hover:text-blue-600 cursor-pointer">Projects</span>
          <span>/</span>
          <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer font-semibold text-slate-700">
            <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
            {projectName} ({projectKey})
          </span>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{viewLabel}</span>
        </nav>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-md shadow-sm">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              {projectKey} {viewLabel}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Agile development workflow & ticket synchronization
            </p>
          </div>
        </div>
      </div>

      {/* Right: Connection Status & Actions */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          <span
            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${statusColorMap[connectionState]}`}
          >
            {connectionState}
          </span>
        </div>

        <button
          onClick={onOpenCredential}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-slate-500" />
          <span>Credentials</span>
        </button>

        <button
          onClick={onScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 border border-blue-200 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning...' : 'Scan Jira'}</span>
        </button>
      </div>
    </header>
  );
};
