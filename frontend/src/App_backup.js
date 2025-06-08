import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { ClusterProvider, useCluster } from './contexts/ClusterContext';
import { useK8sResources } from './hooks/useK8sResource';
import ModernHeader from './components/ModernHeader';
import ModernSidebar from './components/ModernSidebar';
import ModernTabSystem from './components/ModernTabSystem';
import ModernStatusBadge from './components/ModernStatusBadge';
import OptimizedResourceTable from './components/OptimizedResourceTable';
import LogModal from './components/LogModal';
import EditModal from './components/EditModal';
import ShellModal from './components/ShellModal';
import AIAnalysisPanel from './components/AIAnalysisPanel';
import './App.css';
import './styles/optimizations.css';
import './styles/modernTheme.css';

// Modern loading skeleton component
const ModernLoadingFallback = React.memo(() => (
  <div className="p-6 space-y-4 animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <div className="loading-skeleton h-8 w-48"></div>
      <div className="loading-skeleton h-8 w-32"></div>
    </div>
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="loading-skeleton h-12 w-full" style={{ animationDelay: `${i * 0.1}s` }}></div>
      ))}
    </div>
  </div>
));

// Modern dashboard component
const ModernDashboard = React.memo(({ k8sData, onOpenTab, resourceCounts }) => (
  <div className="p-6 space-y-6 animate-slide-in">
    {/* Cluster Overview Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="modern-surface rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wider">Pods</p>
            <p className="text-2xl font-bold text-white">{resourceCounts.pods}</p>
          </div>
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
          </div>
        </div>
        <button 
          onClick={() => onOpenTab('pods')}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all pods →
        </button>
      </div>

      <div className="modern-surface rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wider">Services</p>
            <p className="text-2xl font-bold text-white">{resourceCounts.services}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 bg-blue-500 rounded"></div>
          </div>
        </div>
        <button 
          onClick={() => onOpenTab('services')}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all services →
        </button>
      </div>

      <div className="modern-surface rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wider">Deployments</p>
            <p className="text-2xl font-bold text-white">{resourceCounts.deployments}</p>
          </div>
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 bg-purple-500 rounded"></div>
          </div>
        </div>
        <button 
          onClick={() => onOpenTab('deployments')}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all deployments →
        </button>
      </div>

      <div className="modern-surface rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wider">Nodes</p>
            <p className="text-2xl font-bold text-white">{resourceCounts.nodes}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 bg-yellow-500 rounded"></div>
          </div>
        </div>
        <button 
          onClick={() => onOpenTab('nodes')}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all nodes →
        </button>
      </div>
    </div>

    {/* Recent Activity */}
    <div className="modern-surface rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <ModernStatusBadge status="running" />
          <span className="text-sm text-gray-300">Pod nginx-deployment-abc123 started</span>
          <span className="text-xs text-gray-500 ml-auto">2 minutes ago</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <ModernStatusBadge status="pending" />
          <span className="text-sm text-gray-300">Service load-balancer-svc created</span>
          <span className="text-xs text-gray-500 ml-auto">5 minutes ago</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <ModernStatusBadge status="failed" />
          <span className="text-sm text-gray-300">Pod redis-pod-xyz789 failed to start</span>
          <span className="text-xs text-gray-500 ml-auto">10 minutes ago</span>
        </div>
      </div>
    </div>
  </div>
));

// Hook for resource counts
const useResourceCounts = (k8sData) => {
  return useMemo(() => ({
    pods: k8sData?.pods?.length || 0,
    deployments: k8sData?.deployments?.length || 0,
    services: k8sData?.services?.length || 0,
    nodes: k8sData?.nodes?.length || 0,
    namespaces: k8sData?.namespaces?.length || 0,
    persistentvolumes: k8sData?.persistentvolumes?.length || 0,
    persistentvolumeclaims: k8sData?.persistentvolumeclaims?.length || 0,
    configmaps: k8sData?.configmaps?.length || 0,
    secrets: k8sData?.secrets?.length || 0,
    ingresses: k8sData?.ingresses?.length || 0,
    replicasets: k8sData?.replicasets?.length || 0,
    statefulsets: k8sData?.statefulsets?.length || 0,
    daemonsets: k8sData?.daemonsets?.length || 0,
    jobs: k8sData?.jobs?.length || 0,
    serviceaccounts: k8sData?.serviceaccounts?.length || 0,
  }), [k8sData]);
};

// Main App Content Component
const AppContent = () => {
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { getApiUrl } = useCluster();

  // Use React Query hooks for optimized data fetching
  const { 
    data: k8sData, 
    isLoading, 
    error,
    refetch: refetchAll 
  } = useK8sResources(selectedNamespace);

  // Setup WebSocket for real-time updates (temporarily disabled)
  // useWebSocket({
  //   onUpdate: (data) => {
  //     refetchAll();
  //   }
  // });

  // Get resource counts for sidebar
  const resourceCounts = useResourceCounts(k8sData);

  // Memoized namespace extraction
  const namespaces = useMemo(() => 
    k8sData?.namespaces || [], 
    [k8sData?.namespaces]
  );

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
  }, []);

  // Handle tab changes from sidebar
  const handleTabChange = useCallback((resourceType) => {
    // This will be handled by the tab system
    console.log('Opening tab for:', resourceType);
  }, []);

  // Render tab content based on active tab
  const renderTabContent = useCallback(({ activeTab, openTab }) => {
    if (isLoading) {
      return <ModernLoadingFallback />;
    }

    switch (activeTab?.type) {
      case 'dashboard':
        return (
          <ModernDashboard 
            k8sData={k8sData} 
            onOpenTab={openTab}
            resourceCounts={resourceCounts}
          />
        );
      case 'pods':
        return (
          <Suspense fallback={<ModernLoadingFallback />}>
            <OptimizedResourceTable
              data={k8sData?.pods || []}
              resourceType="pods"
              namespace={selectedNamespace}
              columns={[
                { key: 'name', label: 'Name', sortable: true, resizable: true },
                { key: 'namespace', label: 'Namespace', sortable: true, resizable: true },
                { key: 'status', label: 'Status', sortable: true, resizable: true },
                { key: 'restarts', label: 'Restarts', sortable: true, resizable: true },
                { key: 'age', label: 'Age', sortable: true, resizable: true },
                { key: 'actions', label: 'Actions', resizable: true }
              ]}
            />
          </Suspense>
        );
      case 'services':
        return (
          <Suspense fallback={<ModernLoadingFallback />}>
            <OptimizedResourceTable
              data={k8sData?.services || []}
              resourceType="services"
              namespace={selectedNamespace}
              columns={[
                { key: 'name', label: 'Name', sortable: true, resizable: true },
                { key: 'namespace', label: 'Namespace', sortable: true, resizable: true },
                { key: 'type', label: 'Type', sortable: true, resizable: true },
                { key: 'clusterIP', label: 'Cluster IP', sortable: true, resizable: true },
                { key: 'ports', label: 'Ports', resizable: true },
                { key: 'age', label: 'Age', sortable: true, resizable: true }
              ]}
            />
          </Suspense>
        );
      case 'deployments':
        return (
          <Suspense fallback={<ModernLoadingFallback />}>
            <OptimizedResourceTable
              data={k8sData?.deployments || []}
              resourceType="deployments"
              namespace={selectedNamespace}
              columns={[
                { key: 'name', label: 'Name', sortable: true, resizable: true },
                { key: 'namespace', label: 'Namespace', sortable: true, resizable: true },
                { key: 'ready', label: 'Ready', sortable: true, resizable: true },
                { key: 'upToDate', label: 'Up-to-date', sortable: true, resizable: true },
                { key: 'available', label: 'Available', sortable: true, resizable: true },
                { key: 'age', label: 'Age', sortable: true, resizable: true }
              ]}
            />
          </Suspense>
        );
      case 'nodes':
        return (
          <Suspense fallback={<ModernLoadingFallback />}>
            <OptimizedResourceTable
              data={k8sData?.nodes || []}
              resourceType="nodes"
              namespace=""
              columns={[
                { key: 'name', label: 'Name', sortable: true, resizable: true },
                { key: 'status', label: 'Status', sortable: true, resizable: true },
                { key: 'roles', label: 'Roles', sortable: true, resizable: true },
                { key: 'age', label: 'Age', sortable: true, resizable: true },
                { key: 'version', label: 'Version', sortable: true, resizable: true }
              ]}
            />
          </Suspense>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Resource Type: {activeTab?.type}
              </h3>
              <p className="text-gray-500">
                This resource type will be implemented soon.
              </p>
            </div>
          </div>
        );
    }
  }, [k8sData, isLoading, selectedNamespace, resourceCounts]);

  if (error) {
    return (
      <div className="min-h-screen bg-red-900/10 flex items-center justify-center">
        <div className="glassmorphic-panel rounded-xl p-8 max-w-md animate-scale-in">
          <h2 className="text-xl font-bold text-red-400 mb-4">Connection Error</h2>
          <p className="text-gray-300 mb-6">{error.message}</p>
          <button 
            onClick={() => refetchAll()} 
            className="modern-btn modern-btn-primary w-full"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Modern Header */}
      <ModernHeader onSearch={handleSearch} hasNotifications={false} />
      
      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Modern Sidebar */}
        <ModernSidebar
          activeTab=""
          onTabChange={handleTabChange}
          resourceCounts={resourceCounts}
        />
        
        {/* Main Content with Tabs */}
        <div className="flex-1 flex flex-col">
          {/* Namespace Selector */}
          {namespaces.length > 0 && (
            <div className="px-6 py-3 bg-gray-900/50 border-b border-gray-800">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-400">Namespace:</label>
                <select 
                  value={selectedNamespace} 
                  onChange={(e) => setSelectedNamespace(e.target.value)}
                  className="cluster-selector min-w-48"
                >
                  <option value="">All Namespaces</option>
                  {namespaces.map(ns => (
                    <option key={ns.name || ns} value={ns.name || ns}>
                      {ns.name || ns}
                    </option>
                  ))}
                </select>
                
                {/* Search Results */}
                {searchQuery && (
                  <div className="ml-auto text-sm text-gray-400">
                    Searching for: <span className="text-blue-400">"{searchQuery}"</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tab System */}
          <ModernTabSystem>
            {renderTabContent}
          </ModernTabSystem>
        </div>
      </div>
    </div>
  );
};

// Main App Component wrapped with providers
const App = () => {
  return (
    <QueryProvider>
      <ClusterProvider>
        <AppContent />
      </ClusterProvider>
    </QueryProvider>
  );
};

export default App;
