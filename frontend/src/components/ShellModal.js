import React from 'react';
import { X, Terminal } from 'lucide-react';

const ShellModal = React.memo(({ resource, onClose }) => {
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
            Shell: {resource.name} ({resource.namespace})
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 p-4">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-full flex items-center justify-center">
            <div className="text-center">
              <Terminal className="w-16 h-16 mx-auto mb-6 opacity-50" />
              <h3 className="text-xl mb-4">Terminal Access</h3>
              <p className="text-base mb-4 opacity-75">WebSocket terminal connection</p>
              <div className="space-y-2 text-sm opacity-60">
                <p>🔗 Ready to connect to: <span className="font-mono">{resource.name}</span></p>
                <p>📍 Namespace: <span className="font-mono">{resource.namespace}</span></p>
                <p>💻 Container: <span className="font-mono">{resource.containers?.[0]?.name || 'main'}</span></p>
              </div>
              
              {/* Placeholder for future WebSocket terminal implementation */}
              <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="ml-4 text-xs text-gray-500">Terminal - {resource.name}</span>
                </div>
                <div className="text-left font-mono text-sm">
                  <div className="text-green-400">
                    <span className="text-blue-400">user@{resource.name}</span>
                    <span className="text-white">:</span>
                    <span className="text-cyan-400">~$</span>
                    <span className="animate-pulse">_</span>
                  </div>
                </div>
              </div>
              
              <p className="text-xs mt-4 opacity-40">
                WebSocket terminal implementation would be connected here
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Status: <span className="text-yellow-600 font-medium">Demo Mode</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors">
                Reconnect
              </button>
              <button 
                onClick={onClose}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ShellModal.displayName = 'ShellModal';

export default ShellModal; 