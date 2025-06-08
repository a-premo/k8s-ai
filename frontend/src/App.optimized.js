import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { useK8sWebSocket } from './hooks/useWebSocket';
import { useNamespaces, useK8sResource, useRefreshResource, usePrefetchResources } from './hooks/useK8sResource';
import './App.css';

// Import lucide-react icons
import { 
  BarChart3, Box, Play, Layers, Database, Copy, Activity, Clock,
  FileText, Key, HardDrive, Archive, Package, Network, MapPin,
  TrendingUp, Shield, UserCheck, Users, Globe, GitBranch, Share2,
  Server, FolderOpen, List, Brain, MessageSquare, RefreshCw,
  Search, Filter, Menu, X, ChevronDown, Settings, Plus
} from 'lucide-react';

// Lazy load components for code splitting
const OptimizedResourceTable = lazy(() => import('./components/OptimizedResourceTable'));
const LogModal = lazy(() => import('./components/LogModal'));
const ShellModal = lazy(() => import('./components/ShellModal'));
const EditModal = lazy(() => import('./components/EditModal'));
const AIAnalysisPanel = lazy(() => import('./components/AIAnalysisPanel'));

// Memoized Loading Spinner
const LoadingSpinner = React.memo(() => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <span>Loading...</span>
  </div>
));

// Memoized Error Display
const ErrorDisplay = React.memo(({ error, onRetry }) => (
  <div className="error-display">
    <p>Error: {error.message}</p>
    <button onClick={onRetry} className="retry-button">
      <RefreshCw size={16} /> Retry
    </button>
  </div>
));

// Memoized Connection Status
const ConnectionStatus = React.memo(({ status }) => {
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'connected':
        return { color: 'green', text: 'Connected to Kubernetes', icon: '🟢' };
      case 'connecting':
        return { color: 'yellow', text: 'Connecting...', icon: '🟡' };
      case 'disconnected':
        return { color: 'red', text: 'Disconnected', icon: '🔴' };
      default:
        return { color: 'gray', text: 'Demo Mode', icon: '⚪' };
    }
  }, [status]);

  return (
    <div className={`connection-status status-${statusConfig.color}`}>
      <span>{statusConfig.icon}</span>
      <span>{statusConfig.text}</span>
    </div>
  );
});

// Memoized Tab Component
const Tab = React.memo(({ tab, isActive, onSelect, onClose, canClose = true }) => (
  <div className={`tab ${isActive ? 'active' : ''}`}>
    <button onClick={() => onSelect(tab.id)} className="tab-button">
      {tab.title}
    </button>
    {canClose && (
      <button onClick={(e) => { e.stopPropagation(); onClose(tab.id); }} className="tab-close">
        <X size={14} />
      </button>
    )}
  </div>
));

// Memoized Sidebar Item
const SidebarItem = React.memo(({ item, onSelect, isSelected }) => {
  const Icon = item.icon;
  
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`sidebar-item ${isSelected ? 'selected' : ''}`}
      title={item.label}
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </button>
  );
});

// Memoized Sidebar Category
const SidebarCategory = React.memo(({ category, items, onItemSelect, selectedItem }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const categoryItems = useMemo(() => 
    items.filter(item => item.category === category),
    [items, category]
  );

  return (
    <div className="sidebar-category">
      <button 
        className="category-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{category}</span>
        <ChevronDown size={16} className={`chevron ${isExpanded ? 'expanded' : ''}`} />
      </button>
      {isExpanded && (
        <div className="category-items">
          {categoryItems.map(item => (
            <SidebarItem
              key={item.id}
              item={item}
              onSelect={onItemSelect}
              isSelected={selectedItem === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Main App Component wrapped with performance optimizations
const K8sAIIDECore = () => {
  // State management with proper state shape
  const [uiState, setUiState] = useState({
    openTabs: [{ id: 'overview', type: 'overview', title: 'Overview', namespace: 'All Namespaces' }],
    activeTabId: 'overview',
    selectedNamespace: 'All Namespaces',
    searchQuery: '',
    sidebarCollapsed: false,
    aiChatOpen: false,
  });

  const [modalState, setModalState] = useState({
    log: { open: false, resource: null },
    shell: { open: false, resource: null },
    edit: { open: false, resource: null },
    aiAnalysis: { open: false, resource: null, analysis: null },
  });

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // React Query hooks for data fetching
  const { data: namespaces = ['All Namespaces'], isLoading: namespacesLoading } = useNamespaces();
  
  // WebSocket connection for real-time updates (temporarily disabled)
  const { isConnected: wsConnected, lastMessage } = useK8sWebSocket({
    enabled: false, // Disabled to prevent console errors
    onMessage: useCallback((message) => {
      console.log('Received WebSocket message:', message);
    }, []),
  });

  // Memoized resource types configuration
  const resourceTypes = useMemo(() => [
    // Overview
    { id: 'overview', label: 'Overview', icon: BarChart3, category: 'Overview' },
    
    // Workloads
    { id: 'pods', label: 'Pods', icon: Box, category: 'Workloads' },
    { id: 'deployments', label: 'Deployments', icon: Play, category: 'Workloads' },
    { id: 'daemonsets', label: 'DaemonSets', icon: Layers, category: 'Workloads' },
    { id: 'statefulsets', label: 'StatefulSets', icon: Database, category: 'Workloads' },
    { id: 'replicasets', label: 'ReplicaSets', icon: Copy, category: 'Workloads' },
    { id: 'jobs', label: 'Jobs', icon: Activity, category: 'Workloads' },
    { id: 'cronjobs', label: 'CronJobs', icon: Clock, category: 'Workloads' },
    
    // Config & Storage
    { id: 'configmaps', label: 'ConfigMaps', icon: FileText, category: 'Config & Storage' },
    { id: 'secrets', label: 'Secrets', icon: Key, category: 'Config & Storage' },
    { id: 'persistentvolumes', label: 'Persistent Volumes', icon: HardDrive, category: 'Config & Storage' },
    { id: 'persistentvolumeclaims', label: 'PV Claims', icon: Archive, category: 'Config & Storage' },
    { id: 'storageclasses', label: 'Storage Classes', icon: Package, category: 'Config & Storage' },
    
    // Network
    { id: 'services', label: 'Services', icon: Network, category: 'Network' },
    { id: 'endpoints', label: 'Endpoints', icon: MapPin, category: 'Network' },
    { id: 'ingresses', label: 'Ingresses', icon: TrendingUp, category: 'Network' },
    { id: 'networkpolicies', label: 'Network Policies', icon: Shield, category: 'Network' },
    
    // Access Control
    { id: 'serviceaccounts', label: 'Service Accounts', icon: UserCheck, category: 'Access Control' },
    { id: 'roles', label: 'Roles', icon: Users, category: 'Access Control' },
    { id: 'clusterroles', label: 'Cluster Roles', icon: Globe, category: 'Access Control' },
    { id: 'rolebindings', label: 'Role Bindings', icon: GitBranch, category: 'Access Control' },
    { id: 'clusterrolebindings', label: 'Cluster Role Bindings', icon: Share2, category: 'Access Control' },
    
    // Cluster
    { id: 'nodes', label: 'Nodes', icon: Server, category: 'Cluster' },
    { id: 'namespaces', label: 'Namespaces', icon: FolderOpen, category: 'Cluster' },
    { id: 'events', label: 'Events', icon: List, category: 'Cluster' }
  ], []);

  // Memoized categories
  const categories = useMemo(() => 
    [...new Set(resourceTypes.map(rt => rt.category))],
    [resourceTypes]
  );

  // Get current active tab
  const activeTab = useMemo(() => 
    uiState.openTabs.find(tab => tab.id === uiState.activeTabId),
    [uiState.openTabs, uiState.activeTabId]
  );

  // Optimized handlers with useCallback
  const updateUiState = useCallback((updates) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateModalState = useCallback((modalType, updates) => {
    setModalState(prev => ({
      ...prev,
      [modalType]: { ...prev[modalType], ...updates }
    }));
  }, []);

  const openNewTab = useCallback((resourceType, namespace = uiState.selectedNamespace) => {
    const resourceConfig = resourceTypes.find(rt => rt.id === resourceType);
    if (!resourceConfig) return;

    const existingTab = uiState.openTabs.find(tab => 
      tab.type === resourceType && tab.namespace === namespace
    );

    if (existingTab) {
      updateUiState({ activeTabId: existingTab.id });
      return;
    }

    const newTab = {
      id: `${resourceType}-${namespace}-${Date.now()}`,
      type: resourceType,
      title: `${resourceConfig.label}${namespace !== 'All Namespaces' ? ` (${namespace})` : ''}`,
      namespace,
    };

    updateUiState({
      openTabs: [...uiState.openTabs, newTab],
      activeTabId: newTab.id,
    });
  }, [uiState.openTabs, uiState.selectedNamespace, resourceTypes, updateUiState]);

  const closeTab = useCallback((tabId) => {
    const updatedTabs = uiState.openTabs.filter(tab => tab.id !== tabId);
    let newActiveTabId = uiState.activeTabId;
    
    if (uiState.activeTabId === tabId && updatedTabs.length > 0) {
      newActiveTabId = updatedTabs[updatedTabs.length - 1].id;
    }

    updateUiState({
      openTabs: updatedTabs,
      activeTabId: newActiveTabId,
    });
  }, [uiState.openTabs, uiState.activeTabId, updateUiState]);

  const handleSidebarItemSelect = useCallback((itemId) => {
    if (itemId === 'overview') {
      const overviewTab = uiState.openTabs.find(tab => tab.type === 'overview');
      if (overviewTab) {
        updateUiState({ activeTabId: overviewTab.id });
      }
    } else {
      openNewTab(itemId, uiState.selectedNamespace);
    }
  }, [uiState.openTabs, uiState.selectedNamespace, openNewTab, updateUiState]);

  const handleNamespaceChange = useCallback((namespace) => {
    updateUiState({ selectedNamespace: namespace });
  }, [updateUiState]);

  // Modal handlers
  const handleViewLogs = useCallback((resource) => {
    updateModalState('log', { open: true, resource });
  }, [updateModalState]);

  const handleOpenShell = useCallback((resource) => {
    updateModalState('shell', { open: true, resource });
  }, [updateModalState]);

  const handleEditResource = useCallback((resource) => {
    updateModalState('edit', { open: true, resource });
  }, [updateModalState]);

  const handleAIAnalysis = useCallback((resource) => {
    updateModalState('aiAnalysis', { open: true, resource });
  }, [updateModalState]);

  const closeModal = useCallback((modalType) => {
    updateModalState(modalType, { open: false, resource: null, analysis: null });
  }, [updateModalState]);

  // Render tab content with optimized data fetching
  const renderTabContent = useCallback(() => {
    if (!activeTab) return null;

    if (activeTab.type === 'overview') {
      return <OverviewDashboard namespace={activeTab.namespace} />;
    }

    return (
      <OptimizedResourceTable
        key={`${activeTab.type}-${activeTab.namespace}`}
        resourceType={activeTab.type}
        namespace={activeTab.namespace}
        onEdit={handleEditResource}
        onAIAnalysis={handleAIAnalysis}
        onRefresh={() => {}} // Will be handled by React Query
      />
    );
  }, [activeTab, handleEditResource, handleAIAnalysis]);

  // Connection status based on WebSocket and health
  const connectionStatus = useMemo(() => {
    if (wsConnected) return 'connected';
    return 'disconnected';
  }, [wsConnected]);

  return (
    <div className="k8s-ai-ide">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => updateUiState({ sidebarCollapsed: !uiState.sidebarCollapsed })}
          >
            <Menu size={20} />
          </button>
          <h1>Kubernetes AI IDE</h1>
        </div>
        
        <div className="header-center">
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search resources..."
              value={uiState.searchQuery}
              onChange={(e) => updateUiState({ searchQuery: e.target.value })}
            />
          </div>
        </div>
        
        <div className="header-right">
          <select
            value={uiState.selectedNamespace}
            onChange={(e) => handleNamespaceChange(e.target.value)}
            className="namespace-selector"
          >
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          
          <button 
            className="ai-chat-toggle"
            onClick={() => updateUiState({ aiChatOpen: !uiState.aiChatOpen })}
          >
            <Brain size={20} />
          </button>
          
          <ConnectionStatus status={connectionStatus} />
        </div>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <aside className={`sidebar ${uiState.sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-content">
            {categories.map(category => (
              <SidebarCategory
                key={category}
                category={category}
                items={resourceTypes}
                onItemSelect={handleSidebarItemSelect}
                selectedItem={activeTab?.type}
              />
            ))}
          </div>
        </aside>

        {/* Main panel */}
        <main className="main-panel">
          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs">
              {uiState.openTabs.map(tab => (
                <Tab
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === uiState.activeTabId}
                  onSelect={(tabId) => updateUiState({ activeTabId: tabId })}
                  onClose={closeTab}
                  canClose={uiState.openTabs.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="tab-content">
            <Suspense fallback={<LoadingSpinner />}>
              {renderTabContent()}
            </Suspense>
          </div>
        </main>

        {/* AI Chat Panel */}
        {uiState.aiChatOpen && (
          <div className="ai-chat-panel">
            <div className="chat-header">
              <h3>AI Assistant</h3>
              <button onClick={() => updateUiState({ aiChatOpen: false })}>
                <X size={16} />
              </button>
            </div>
            <div className="chat-messages">
              {/* Chat implementation */}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {modalState.log.open && (
          <LogModal
            resource={modalState.log.resource}
            onClose={() => closeModal('log')}
          />
        )}

        {modalState.shell.open && (
          <ShellModal
            resource={modalState.shell.resource}
            onClose={() => closeModal('shell')}
          />
        )}

        {modalState.edit.open && (
          <EditModal
            resource={modalState.edit.resource}
            onClose={() => closeModal('edit')}
          />
        )}

        {modalState.aiAnalysis.open && (
          <AIAnalysisPanel
            resource={modalState.aiAnalysis.resource}
            analysis={modalState.aiAnalysis.analysis}
            onClose={() => closeModal('aiAnalysis')}
          />
        )}
      </Suspense>
    </div>
  );
};

// Memoized Overview Dashboard
const OverviewDashboard = React.memo(({ namespace }) => {
  const { data: pods = [], isLoading: podsLoading } = useK8sResource('pods', namespace);
  const { data: nodes = [], isLoading: nodesLoading } = useK8sResource('nodes', 'all');
  const { data: deployments = [], isLoading: deploymentsLoading } = useK8sResource('deployments', namespace);
  const { data: services = [], isLoading: servicesLoading } = useK8sResource('services', namespace);

  const stats = useMemo(() => {
    const podStats = pods.reduce((acc, pod) => {
      acc.total++;
      if (pod.status === 'Running') acc.running++;
      else if (pod.status === 'Pending') acc.pending++;
      else if (pod.status === 'Failed') acc.failed++;
      return acc;
    }, { total: 0, running: 0, pending: 0, failed: 0 });

    const nodeStats = nodes.reduce((acc, node) => {
      acc.total++;
      if (node.status === 'Ready') acc.ready++;
      return acc;
    }, { total: 0, ready: 0 });

    return {
      pods: podStats,
      nodes: nodeStats,
      deployments: deployments.length,
      services: services.length,
    };
  }, [pods, nodes, deployments, services]);

  if (podsLoading || nodesLoading || deploymentsLoading || servicesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="overview-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <h3>Pods</h3>
            <Box size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.pods.total}</div>
            <div className="stat-details">
              <span className="stat-running">{stats.pods.running} Running</span>
              <span className="stat-pending">{stats.pods.pending} Pending</span>
              <span className="stat-failed">{stats.pods.failed} Failed</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Nodes</h3>
            <Server size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.nodes.total}</div>
            <div className="stat-details">
              <span className="stat-ready">{stats.nodes.ready} Ready</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Deployments</h3>
            <Play size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.deployments}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Services</h3>
            <Network size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.services}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Main App with Query Provider
const App = () => {
  return (
    <QueryProvider>
      <K8sAIIDECore />
    </QueryProvider>
  );
};

export default App; 