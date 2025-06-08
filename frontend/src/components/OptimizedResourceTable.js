import React, { useMemo, useCallback, useState, lazy, Suspense } from 'react';
import VirtualTable from './VirtualTable';
import { useResourceFilter, useResourceSort } from '../hooks/useDataWorker';

// Lazy load modal components for better code splitting
const ResourceDetailModal = lazy(() => import('./ResourceDetailModal'));
const EditModal = lazy(() => import('./EditModal'));
const LogModal = lazy(() => import('./LogModal'));
const ShellModal = lazy(() => import('./ShellModal'));
const AIAnalysisPanel = lazy(() => import('./AIAnalysisPanel'));

// Memoized status badge component
const StatusBadge = React.memo(({ status }) => (
  <span className={`status-badge status-${status?.toLowerCase()}`}>
    {status}
  </span>
));

// Memoized clickable name component
const ClickableName = React.memo(({ name, onClick }) => (
  <button 
    className="clickable-cell resource-name"
    onClick={onClick}
    title={`View details for ${name}`}
  >
    {name}
  </button>
));

// Memoized age calculation
const ResourceAge = React.memo(({ timestamp }) => {
  const age = useMemo(() => {
    if (!timestamp) return '-';
    const now = new Date();
    const created = new Date(timestamp);
    const diff = now - created;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }, [timestamp]);

  return <span title={timestamp}>{age}</span>;
});

// Main optimized resource table component
const OptimizedResourceTable = React.memo(({
  resourceType,
  namespace = 'All Namespaces',
  data = [],
  loading = false,
  error = null,
  onRefresh,
  onEdit,
  onAIAnalysis,
  className = '',
}) => {
  // Modal states
  const [selectedResource, setSelectedResource] = useState(null);
  const [modalState, setModalState] = useState({
    detail: false,
    edit: false,
    logs: false,
    shell: false,
    aiAnalysis: false,
  });

  // Initialize filtering and sorting with web workers
  const {
    filteredResources,
    filters,
    setFilters,
    isFiltering,
  } = useResourceFilter(data, { namespace });

  const {
    sortedResources,
    handleSort,
    sortConfig,
    isSorting,
  } = useResourceSort(filteredResources);

  // Memoized column configuration based on resource type
  const columns = useMemo(() => {
    const baseColumns = [
      {
        header: 'Name',
        accessor: 'name',
        width: '200px',
        type: 'clickable',
        render: (resource) => (
          <ClickableName 
            name={resource.name}
            onClick={() => handleResourceClick(resource)}
          />
        ),
      },
      {
        header: 'Namespace',
        accessor: 'namespace',
        width: '150px',
        render: (resource) => resource.namespace || '-',
      },
      {
        header: 'Status',
        accessor: 'status',
        width: '120px',
        type: 'status',
        render: (resource) => <StatusBadge status={resource.status} />,
      },
      {
        header: 'Age',
        accessor: 'creationTimestamp',
        width: '100px',
        render: (resource) => (
          <ResourceAge timestamp={resource.creationTimestamp} />
        ),
      },
    ];

    // Add resource-specific columns
    switch (resourceType) {
      case 'pods':
        return [
          ...baseColumns,
          {
            header: 'Ready',
            accessor: 'ready',
            width: '80px',
            render: (resource) => `${resource.readyContainers || 0}/${resource.totalContainers || 0}`,
          },
          {
            header: 'Restarts',
            accessor: 'restarts',
            width: '80px',
          },
          {
            header: 'Node',
            accessor: 'nodeName',
            width: '150px',
          },
        ];
      
      case 'services':
        return [
          ...baseColumns,
          {
            header: 'Type',
            accessor: 'type',
            width: '120px',
          },
          {
            header: 'Cluster IP',
            accessor: 'clusterIP',
            width: '120px',
          },
          {
            header: 'External IP',
            accessor: 'externalIP',
            width: '120px',
            render: (resource) => resource.externalIP || '-',
          },
        ];
      
      case 'deployments':
        return [
          ...baseColumns,
          {
            header: 'Ready',
            accessor: 'replicas',
            width: '100px',
            render: (resource) => `${resource.readyReplicas || 0}/${resource.replicas || 0}`,
          },
          {
            header: 'Up-to-date',
            accessor: 'updatedReplicas',
            width: '100px',
          },
          {
            header: 'Available',
            accessor: 'availableReplicas',
            width: '100px',
          },
        ];
      
      case 'nodes':
        return [
          {
            header: 'Name',
            accessor: 'name',
            width: '200px',
            type: 'clickable',
            render: (resource) => (
              <ClickableName 
                name={resource.name}
                onClick={() => handleResourceClick(resource)}
              />
            ),
          },
          {
            header: 'Status',
            accessor: 'status',
            width: '120px',
            type: 'status',
            render: (resource) => <StatusBadge status={resource.status} />,
          },
          {
            header: 'Roles',
            accessor: 'roles',
            width: '150px',
            render: (resource) => Array.isArray(resource.roles) ? resource.roles.join(', ') : (resource.roles || '-'),
          },
          {
            header: 'Version',
            accessor: 'version',
            width: '120px',
          },
          {
            header: 'Age',
            accessor: 'creationTimestamp',
            width: '100px',
            render: (resource) => (
              <ResourceAge timestamp={resource.creationTimestamp} />
            ),
          },
        ];

      case 'ingresses':
        return [
          ...baseColumns,
          {
            header: 'Hosts',
            accessor: 'hosts',
            width: '200px',
            render: (resource) => Array.isArray(resource.hosts) ? resource.hosts.join(', ') : (resource.hosts || '-'),
          },
          {
            header: 'Class',
            accessor: 'className',
            width: '120px',
          },
        ];

      case 'secrets':
        return [
          ...baseColumns,
          {
            header: 'Type',
            accessor: 'type',
            width: '150px',
          },
          {
            header: 'Data',
            accessor: 'dataCount',
            width: '80px',
            render: (resource) => `${resource.dataCount || 0} keys`,
          },
        ];

      case 'configmaps':
        return [
          ...baseColumns,
          {
            header: 'Data',
            accessor: 'dataCount',
            width: '80px',
            render: (resource) => `${resource.dataCount || 0} keys`,
          },
        ];

      case 'persistentvolumes':
        return [
          {
            header: 'Name',
            accessor: 'name',
            width: '200px',
            type: 'clickable',
            render: (resource) => (
              <ClickableName 
                name={resource.name}
                onClick={() => handleResourceClick(resource)}
              />
            ),
          },
          {
            header: 'Capacity',
            accessor: 'capacity',
            width: '100px',
          },
          {
            header: 'Access Modes',
            accessor: 'accessModes',
            width: '150px',
            render: (resource) => Array.isArray(resource.accessModes) ? resource.accessModes.join(', ') : (resource.accessModes || '-'),
          },
          {
            header: 'Reclaim Policy',
            accessor: 'reclaimPolicy',
            width: '120px',
          },
          {
            header: 'Status',
            accessor: 'status',
            width: '120px',
            type: 'status',
            render: (resource) => <StatusBadge status={resource.status} />,
          },
          {
            header: 'Age',
            accessor: 'creationTimestamp',
            width: '100px',
            render: (resource) => (
              <ResourceAge timestamp={resource.creationTimestamp} />
            ),
          },
        ];

      case 'persistentvolumeclaims':
        return [
          ...baseColumns,
          {
            header: 'Capacity',
            accessor: 'capacity',
            width: '100px',
          },
          {
            header: 'Access Modes',
            accessor: 'accessModes',
            width: '150px',
            render: (resource) => Array.isArray(resource.accessModes) ? resource.accessModes.join(', ') : (resource.accessModes || '-'),
          },
          {
            header: 'Storage Class',
            accessor: 'storageClass',
            width: '120px',
          },
        ];

      case 'events':
        return [
          {
            header: 'Type',
            accessor: 'type',
            width: '80px',
            type: 'status',
            render: (resource) => <StatusBadge status={resource.type} />,
          },
          {
            header: 'Reason',
            accessor: 'reason',
            width: '120px',
          },
          {
            header: 'Object',
            accessor: 'object',
            width: '150px',
            render: (resource) => `${resource.objectKind}/${resource.objectName}`,
          },
          {
            header: 'Message',
            accessor: 'message',
            width: '300px',
          },
          {
            header: 'Age',
            accessor: 'firstTimestamp',
            width: '100px',
            render: (resource) => (
              <ResourceAge timestamp={resource.firstTimestamp} />
            ),
          },
        ];

      case 'replicasets':
      case 'statefulsets':
      case 'daemonsets':
        return [
          ...baseColumns,
          {
            header: 'Desired',
            accessor: 'desired',
            width: '80px',
          },
          {
            header: 'Current',
            accessor: 'current',
            width: '80px',
          },
          {
            header: 'Ready',
            accessor: 'ready',
            width: '80px',
          },
        ];

      case 'jobs':
        return [
          ...baseColumns,
          {
            header: 'Completions',
            accessor: 'completions',
            width: '100px',
            render: (resource) => `${resource.succeeded || 0}/${resource.completions || 1}`,
          },
          {
            header: 'Duration',
            accessor: 'duration',
            width: '100px',
          },
        ];

      case 'cronjobs':
        return [
          ...baseColumns,
          {
            header: 'Schedule',
            accessor: 'schedule',
            width: '120px',
          },
          {
            header: 'Suspend',
            accessor: 'suspend',
            width: '80px',
            render: (resource) => resource.suspend ? 'Yes' : 'No',
          },
          {
            header: 'Active',
            accessor: 'active',
            width: '80px',
          },
          {
            header: 'Last Schedule',
            accessor: 'lastScheduleTime',
            width: '120px',
            render: (resource) => (
              <ResourceAge timestamp={resource.lastScheduleTime} />
            ),
          },
        ];

      case 'endpoints':
        return [
          ...baseColumns,
          {
            header: 'Endpoints',
            accessor: 'endpoints',
            width: '200px',
            render: (resource) => `${resource.endpointCount || 0} endpoints`,
          },
        ];

      case 'roles':
      case 'clusterroles':
        return [
          resourceType === 'roles' ? baseColumns[1] : null, // namespace column only for roles
          {
            header: 'Name',
            accessor: 'name',
            width: '200px',
            type: 'clickable',
            render: (resource) => (
              <ClickableName 
                name={resource.name}
                onClick={() => handleResourceClick(resource)}
              />
            ),
          },
          {
            header: 'Age',
            accessor: 'creationTimestamp',
            width: '100px',
            render: (resource) => (
              <ResourceAge timestamp={resource.creationTimestamp} />
            ),
          },
        ].filter(Boolean);

      case 'serviceaccounts':
        return [
          ...baseColumns,
          {
            header: 'Secrets',
            accessor: 'secrets',
            width: '80px',
            render: (resource) => resource.secretCount || 0,
          },
        ];
      
      default:
        return baseColumns;
    }
  }, [resourceType]);

  // Memoized row actions based on resource type
  const rowActions = useMemo(() => {
    const baseActions = [
      {
        label: 'Edit',
        icon: '✏️',
        variant: 'primary',
        onClick: (resource) => handleEdit(resource),
      },
      {
        label: 'AI Analysis',
        icon: '🤖',
        variant: 'default',
        onClick: (resource) => handleAIAnalysis(resource),
      },
    ];

    // Add resource-specific actions
    if (resourceType === 'pods') {
      return [
        {
          label: 'Logs',
          icon: '📋',
          variant: 'default',
          onClick: (resource) => handleViewLogs(resource),
          disabled: (resource) => resource.status !== 'Running',
        },
        {
          label: 'Shell',
          icon: '💻',
          variant: 'default',
          onClick: (resource) => handleShell(resource),
          disabled: (resource) => resource.status !== 'Running',
        },
        ...baseActions,
      ];
    }

    return baseActions;
  }, [resourceType]);

  // Event handlers with useCallback for optimization
  const handleResourceClick = useCallback((resource) => {
    setSelectedResource(resource);
    setModalState(prev => ({ ...prev, detail: true }));
  }, []);

  const handleEdit = useCallback((resource) => {
    setSelectedResource(resource);
    setModalState(prev => ({ ...prev, edit: true }));
    onEdit?.(resource);
  }, [onEdit]);

  const handleViewLogs = useCallback((resource) => {
    setSelectedResource(resource);
    setModalState(prev => ({ ...prev, logs: true }));
  }, []);

  const handleShell = useCallback((resource) => {
    setSelectedResource(resource);
    setModalState(prev => ({ ...prev, shell: true }));
  }, []);

  const handleAIAnalysis = useCallback((resource) => {
    setSelectedResource(resource);
    setModalState(prev => ({ ...prev, aiAnalysis: true }));
    onAIAnalysis?.(resource);
  }, [onAIAnalysis]);

  const closeModal = useCallback((modalType) => {
    setModalState(prev => ({ ...prev, [modalType]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModalState({
      detail: false,
      edit: false,
      logs: false,
      shell: false,
      aiAnalysis: false,
    });
    setSelectedResource(null);
  }, []);

  // Memoized action click handler
  const handleActionClick = useCallback((action, resource) => {
    if (action.onClick) {
      action.onClick(resource);
    }
  }, []);

  // Loading state with proper memoization
  const isLoading = loading || isFiltering || isSorting;

  return (
    <div className={`optimized-resource-table ${className}`}>
      {/* Table Controls */}
      <div className="table-controls">
        <div className="search-filters">
          <input
            type="text"
            placeholder={`Search ${resourceType}...`}
            value={filters.search || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          
          {/* Status filter */}
          <select
            value={filters.status || 'all'}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="succeeded">Succeeded</option>
          </select>
        </div>
        
        <button 
          onClick={onRefresh}
          className="refresh-button"
          disabled={isLoading}
        >
          {isLoading ? '⟳' : '🔄'} Refresh
        </button>
      </div>

      {/* Virtualized Table */}
      <VirtualTable
        data={sortedResources}
        columns={columns}
        rowActions={rowActions}
        onRowClick={handleResourceClick}
        onActionClick={handleActionClick}
        loading={isLoading}
        error={error}
        estimateSize={60}
        className="resource-table"
      />

      {/* Lazy-loaded Modals */}
      <Suspense fallback={<div>Loading...</div>}>
        {modalState.detail && selectedResource && (
          <ResourceDetailModal
            resource={selectedResource}
            resourceType={resourceType}
            onClose={() => closeModal('detail')}
          />
        )}
        
        {modalState.edit && selectedResource && (
          <EditModal
            resource={selectedResource}
            resourceType={resourceType}
            onClose={() => closeModal('edit')}
            onSave={onRefresh}
          />
        )}
        
        {modalState.logs && selectedResource && (
          <LogModal
            resource={selectedResource}
            onClose={() => closeModal('logs')}
          />
        )}
        
        {modalState.shell && selectedResource && (
          <ShellModal
            resource={selectedResource}
            onClose={() => closeModal('shell')}
          />
        )}
        
        {modalState.aiAnalysis && selectedResource && (
          <AIAnalysisPanel
            resource={selectedResource}
            resourceType={resourceType}
            onClose={() => closeModal('aiAnalysis')}
          />
        )}
      </Suspense>
    </div>
  );
});

OptimizedResourceTable.displayName = 'OptimizedResourceTable';

export default OptimizedResourceTable; 