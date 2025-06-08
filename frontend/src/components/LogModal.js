import React from 'react';
import { X } from 'lucide-react';
import { usePodLogs } from '../hooks/useK8sResource';

const LogModal = React.memo(({ resource, onClose }) => {
  const { data: logs, isLoading, error } = usePodLogs(
    resource?.namespace,
    resource?.name,
    resource?.containers?.[0]?.name || 'main', // Default to first container or 'main'
    1000 // Number of lines
  );

  if (!resource) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg w-4/5 h-4/5 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            Logs: {resource.name} ({resource.namespace})
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full bg-gray-900 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-green-400">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading logs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400">
                <div className="text-center">
                  <p className="text-lg mb-2">Error loading logs</p>
                  <p className="text-sm opacity-75">{error.message}</p>
                </div>
              </div>
            ) : (
              <pre className="text-green-400 p-4 text-xs font-mono h-full overflow-auto whitespace-pre-wrap">
                {logs || 'No logs available'}
              </pre>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {resource.containers?.length > 1 && (
                <>Container: {resource.containers[0]?.name || 'main'}</>
              )}
            </span>
            <span>Last 1000 lines</span>
          </div>
        </div>
      </div>
    </div>
  );
});

LogModal.displayName = 'LogModal';

export default LogModal; 