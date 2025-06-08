import React, { useState, useEffect } from 'react';
import { X, FileText, Code, Activity, Terminal, Eye, Edit3, Trash2, RefreshCw, Sparkles, Save, RotateCcw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useK8sResourceDetail, usePodLogs, useEditResource, useAIEditResource } from '../hooks/useK8sResource';

const ResourceDetail = React.memo(({ resource, resourceType, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedYaml, setEditedYaml] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  
  const { data: resourceDetail, isLoading: yamlLoading, error: detailError } = useK8sResourceDetail(
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
  const aiEditMutation = useAIEditResource();

  // Update edited YAML when resource data loads
  useEffect(() => {
    if (resourceDetail?.yaml) {
      setEditedYaml(resourceDetail.yaml);
    }
  }, [resourceDetail]);

  // Fetch events when Events tab is active
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab, resource, resourceType]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isEditMode) {
          setIsEditMode(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isEditMode]);

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/k8s/resource/${resourceType}/${resource.namespace}/${resource.name}/events`
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data || []);
      } else {
        console.error('Failed to fetch events:', response.statusText);
        setEvents([]);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now - time;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

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
          'IP': resource.ip || resource.podIP || 'N/A',
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

  const getAdditionalInfo = () => {
    if (resourceType === 'pods') {
      return {
        'Node': resource.node || 'N/A',
        'Pod IP': resource.ip || resource.podIP || 'N/A',
        'Restarts': resource.restarts?.toString() || '0',
        'QoS Class': resource.qosClass || 'BestEffort',
        'Priority': resource.priority?.toString() || '0',
        'Service Account': resource.serviceAccount || 'default',
      };
    }
    
    if (resourceType === 'deployments') {
      return {
        'Ready Replicas': `${resource.readyReplicas || 0}/${resource.replicas || 0}`,
        'Updated Replicas': resource.updatedReplicas?.toString() || '0',
        'Available Replicas': resource.availableReplicas?.toString() || '0',
        'Strategy Type': resource.strategyType || 'RollingUpdate',
      };
    }
    
    if (resourceType === 'services') {
      return {
        'Type': resource.type || 'ClusterIP',
        'Cluster IP': resource.clusterIP || 'None',
        'External IP': resource.externalIP || 'None',
        'Session Affinity': resource.sessionAffinity || 'None',
      };
    }
    
    return {};
  };

  const handleSaveYaml = async () => {
    try {
      await editMutation.mutateAsync({
        resourceType,
        namespace: resource.namespace,
        name: resource.name,
        yaml: editedYaml
      });
      setIsEditMode(false);
      setShowAiAssist(false);
    } catch (error) {
      console.error('Failed to save YAML:', error);
    }
  };

  const handleAiAssist = async () => {
    if (!aiInstructions.trim()) return;
    
    try {
      const response = await aiEditMutation.mutateAsync({
        resourceType,
        currentYaml: editedYaml,
        instructions: aiInstructions
      });
      
      if (response.modified_yaml) {
        setEditedYaml(response.modified_yaml);
      }
      setAiInstructions('');
    } catch (error) {
      console.error('AI assist failed:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditedYaml(resourceDetail?.yaml || '');
    setIsEditMode(false);
    setShowAiAssist(false);
    setAiInstructions('');
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const InfoItem = ({ label, value }) => (
    <div className="flex justify-between">
      <dt className="text-sm font-medium text-gray-600">{label}:</dt>
      <dd className="text-sm text-gray-900 text-right max-w-xs truncate" title={value}>
        {value}
      </dd>
    </div>
  );

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
                        <InfoItem key={key} label={key} value={value} />
                      ))}
                    </dl>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dl className="space-y-3">
                      {Object.entries(getAdditionalInfo()).map(([key, value]) => (
                        <InfoItem key={key} label={key} value={value} />
                      ))}
                    </dl>
                  </div>
                  
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
                        onClick={() => setShowAiAssist(!showAiAssist)}
                        className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-100 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Assist
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-100 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveYaml}
                        disabled={editMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {editMutation.isPending ? 'Applying...' : 'Apply'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* AI Assist Panel */}
              {showAiAssist && isEditMode && (
                <div className="p-4 bg-blue-50 border-b">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g., 'add resource limits of 1 CPU and 2Gi memory' or 'increase replicas to 3'"
                      value={aiInstructions}
                      onChange={(e) => setAiInstructions(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAiAssist()}
                    />
                    <button
                      onClick={handleAiAssist}
                      disabled={!aiInstructions.trim() || aiEditMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {aiEditMutation.isPending ? 'Processing...' : 'Apply AI'}
                    </button>
                  </div>
                  {aiEditMutation.isError && (
                    <p className="text-red-600 text-sm mt-2">
                      AI assist failed: {aiEditMutation.error?.message || 'Unknown error'}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex-1 overflow-hidden">
                {yamlLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : detailError ? (
                  <div className="flex items-center justify-center h-full text-red-600">
                    <div className="text-center">
                      <X className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Failed to load YAML</p>
                      <p className="text-sm mt-2">{detailError?.message || 'Unknown error'}</p>
                    </div>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language="yaml"
                    theme="vs-dark"
                    value={isEditMode ? editedYaml : (resourceDetail?.yaml || '')}
                    onChange={(value) => isEditMode && setEditedYaml(value || '')}
                    options={{
                      readOnly: !isEditMode,
                      minimap: { enabled: false },
                      fontSize: 13,
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      insertSpaces: true,
                    }}
                  />
                )}
              </div>
              
              {editMutation.isError && (
                <div className="p-3 bg-red-50 border-t border-red-200 text-red-700 text-sm">
                  Failed to save: {editMutation.error?.message || 'Unknown error'}
                </div>
              )}
              
              {editMutation.isSuccess && (
                <div className="p-3 bg-green-50 border-t border-green-200 text-green-700 text-sm">
                  Resource updated successfully!
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="p-6 overflow-auto h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Events</h3>
              {eventsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No events found for this resource</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        event.type === 'Warning'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                event.type === 'Warning'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {event.type}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {event.reason}
                            </span>
                            {event.count > 1 && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                ×{event.count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{event.message}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Source: {event.sourceComponent || 'Unknown'}</span>
                            <span>Last seen: {formatTime(event.lastSeen)}</span>
                            {event.firstSeen !== event.lastSeen && (
                              <span>First seen: {formatTime(event.firstSeen)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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