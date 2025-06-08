import React, { useState, useEffect } from 'react';
import { X, FileText, Code, Activity, Terminal, Eye, Edit3, Trash2, RefreshCw } from 'lucide-react';
import { useK8sResourceDetail, useGetResourceYaml, usePodLogs, useEditResource } from '../hooks/useK8sResource';

const ResourceDetail = React.memo(({ resource, resourceType, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  
  const { data: resourceDetail, isLoading: detailLoading, error: detailError } = useK8sResourceDetail(
    resourceType, 
    resource.namespace, 
    resource.name
  );
  
  const { data: resourceYaml, isLoading: yamlLoading } = useGetResourceYaml(
    resourceType,
    resource.namespace,
    resource.name
  );
  
  const { data: logs, isLoading: logsLoading } = usePodLogs(
    resource.namespace,
    resource.name,
    'main', // Default container
    500,
    { enabled: resourceType === 'pods' && activeTab === 'logs' }
  );
  
  const editMutation = useEditResource();

  useEffect(() => {
    if (resourceYaml && !isEditMode) {
      setYamlContent(resourceYaml);
    }
  }, [resourceYaml, isEditMode]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!resource) return null;

  const isPodResource = resourceType === 'pods';
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'yaml', label: 'YAML', icon: Code },
    { id: 'events', label: 'Events', icon: Activity },
    ...(isPodResource ? [
      { id: 'logs', label: 'Logs', icon: Eye },
      { id: 'shell', label: 'Shell', icon: Terminal }
    ] : [])
  ];

  const getResourceFields = () => {
    const common = {
      'Name': resource.name,
      'Namespace': resource.namespace || 'N/A',
      'Created': resource.age || resource.createdAt,
      'Labels': resource.labels ? Object.entries(resource.labels).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None',
      'Annotations': resource.annotations ? Object.keys(resource.annotations).length : '0',
    };

    switch (resourceType) {
      case 'pods':
        return {
          ...common,
          'Status': resource.status,
          'Ready': resource.ready,
          'Restarts': resource.restarts,
          'Node': resource.node,
          'IP': resource.ip || 'N/A',
          'Containers': resource.containers?.map(c => c.name).join(', ') || 'N/A',
        };
      case 'deployments':
        return {
          ...common,
          'Ready': resource.ready,
          'Up-to-date': resource.upToDate,
          'Available': resource.available,
          'Strategy': resource.strategy || 'RollingUpdate',
        };
      case 'services':
        return {
          ...common,
          'Type': resource.type,
          'Cluster IP': resource.clusterIP,
          'External IP': resource.externalIP || 'N/A',
          'Ports': Array.isArray(resource.ports) ? resource.ports.join(', ') : (resource.ports || 'N/A'),
        };
      case 'nodes':
        return {
          ...common,
          'Status': resource.status,
          'Roles': Array.isArray(resource.roles) ? resource.roles.join(', ') : (resource.roles || 'N/A'),
          'Version': resource.version,
          'OS': resource.osImage || 'N/A',
          'CPU': resource.resources?.cpuUsage || 'N/A',
          'Memory': resource.resources?.memUsage || 'N/A',
        };
      default:
        return common;
    }
  };

  const handleSaveYaml = async () => {
    try {
      await editMutation.mutateAsync({
        resourceType,
        namespace: resource.namespace,
        name: resource.name,
        yaml: yamlContent
      });
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save YAML:', error);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg w-5/6 h-5/6 flex flex-col shadow-2xl max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold capitalize">
                {resourceType.slice(0, -1)}: {resource.name}
              </h2>
              <p className="text-sm text-gray-600">
                {resource.namespace && `Namespace: ${resource.namespace}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Edit Resource"
              onClick={() => {
                setActiveTab('yaml');
                setIsEditMode(true);
              }}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-red-500 hover:text-red-700 transition-colors"
              title="Delete Resource"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6 overflow-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Resource Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dl className="space-y-3">
                      {Object.entries(getResourceFields()).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-600">{key}:</dt>
                          <dd className="text-sm text-gray-900 text-right max-w-xs truncate" title={value}>
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab('yaml')}
                      className="w-full flex items-center gap-2 p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Code className="w-4 h-4 text-blue-600" />
                      <span>View/Edit YAML</span>
                    </button>
                    
                    {isPodResource && (
                      <>
                        <button
                          onClick={() => setActiveTab('logs')}
                          className="w-full flex items-center gap-2 p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-green-600" />
                          <span>View Logs</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('shell')}
                          className="w-full flex items-center gap-2 p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Terminal className="w-4 h-4 text-purple-600" />
                          <span>Open Shell</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'yaml' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">YAML Configuration</h3>
                  {isEditMode && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                      Edit Mode
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={() => setIsEditMode(false)}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveYaml}
                        disabled={editMutation.isPending}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {editMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 p-4">
                {yamlLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <textarea
                    value={yamlContent}
                    onChange={(e) => setYamlContent(e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full h-full font-mono text-sm border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isEditMode ? 'bg-white' : 'bg-gray-50'
                    }`}
                    spellCheck={false}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="p-6 overflow-auto h-full">
              <div className="text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Events for this resource would be displayed here</p>
                <p className="text-sm mt-2">Implementation: GET /api/v1/k8s/events?fieldSelector=involvedObject.name={resource.name}</p>
              </div>
            </div>
          )}

          {activeTab === 'logs' && isPodResource && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium">Container Logs</h3>
              </div>
              <div className="flex-1 p-4 bg-gray-900 overflow-hidden">
                {logsLoading ? (
                  <div className="flex items-center justify-center h-full text-green-400">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>Loading logs...</p>
                    </div>
                  </div>
                ) : (
                  <pre className="text-green-400 text-xs font-mono h-full overflow-auto whitespace-pre-wrap">
                    {logs || 'No logs available'}
                  </pre>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shell' && isPodResource && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium">Shell Access</h3>
              </div>
              <div className="flex-1 p-4 bg-gray-900 flex items-center justify-center">
                <div className="text-center text-green-400">
                  <Terminal className="w-16 h-16 mx-auto mb-6 opacity-50" />
                  <h3 className="text-xl mb-4">Terminal Access</h3>
                  <p className="text-base mb-4 opacity-75">WebSocket terminal connection</p>
                  <div className="space-y-2 text-sm opacity-60">
                    <p>🔗 Ready to connect to: <span className="font-mono">{resource.name}</span></p>
                    <p>📍 Namespace: <span className="font-mono">{resource.namespace}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ResourceDetail.displayName = 'ResourceDetail';

export default ResourceDetail; 