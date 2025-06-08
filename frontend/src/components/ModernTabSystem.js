import React, { useState, useCallback, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { useCluster } from '../contexts/ClusterContext';

const ModernTabSystem = ({ children }) => {
  const [tabs, setTabs] = useState([
    {
      id: 'dashboard',
      type: 'dashboard',
      title: 'Dashboard',
      namespace: 'all',
      closable: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('dashboard');
  const { getCurrentClusterInfo } = useCluster();

  const currentClusterInfo = getCurrentClusterInfo();

  // Smart tab opening - prevent duplicates
  const openTab = useCallback((resourceType, namespace = 'all', additionalParams = {}) => {
    const tabKey = `${resourceType}-${namespace}`;
    const existingTab = tabs.find(tab => 
      tab.type === resourceType && tab.namespace === namespace
    );
    
    if (existingTab) {
      // Switch to existing tab instead of creating new one
      setActiveTabId(existingTab.id);
      return existingTab;
    } else {
      // Create new tab
      const newTab = {
        id: Date.now(),
        type: resourceType,
        title: resourceType.charAt(0).toUpperCase() + resourceType.slice(1),
        namespace,
        closable: true,
        cluster: currentClusterInfo?.id,
        ...additionalParams
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      return newTab;
    }
  }, [tabs, currentClusterInfo]);

  // Close tab
  const closeTab = useCallback((tabId) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // If closing active tab, switch to previous tab
      if (tabId === activeTabId) {
        const closingTabIndex = prev.findIndex(tab => tab.id === tabId);
        const newActiveTab = newTabs[Math.max(0, closingTabIndex - 1)];
        setActiveTabId(newActiveTab?.id || newTabs[0]?.id);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  // Get active tab
  const activeTab = useMemo(() => 
    tabs.find(tab => tab.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  // Handle tab click
  const handleTabClick = useCallback((tabId) => {
    setActiveTabId(tabId);
  }, []);

  // Render tab content based on type
  const renderTabContent = useMemo(() => {
    if (typeof children === 'function') {
      return children({ activeTab, openTab, closeTab });
    }
    return children;
  }, [children, activeTab, openTab, closeTab]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="modern-tabs">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={`modern-tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Tab Icon based on type */}
            <div className="w-2 h-2 rounded-full bg-current opacity-60" />
            
            {/* Tab Title */}
            <span className="text-sm font-medium">
              {tab.title}
              {tab.namespace !== 'all' && (
                <span className="ml-1 text-xs opacity-60">({tab.namespace})</span>
              )}
            </span>

            {/* Close Button */}
            {tab.closable && (
              <button
                className="close-btn ml-2 p-1 hover:bg-white/10 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Add Tab Button */}
        <button 
          className="modern-tab opacity-50 hover:opacity-100"
          onClick={() => openTab('pods')}
          title="Open new tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-gray-900/30">
        {renderTabContent}
      </div>

      {/* Tab Navigation Info */}
      {tabs.length > 1 && (
        <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800 text-xs text-gray-400">
          {tabs.length} tab{tabs.length > 1 ? 's' : ''} • 
          Press Ctrl+W to close tab • 
          Press Ctrl+T to open new tab
        </div>
      )}
    </div>
  );
};

// Hook for using tab system in components
export const useTabSystem = () => {
  const context = React.useContext(TabSystemContext);
  if (!context) {
    throw new Error('useTabSystem must be used within ModernTabSystem');
  }
  return context;
};

// Context for tab system
const TabSystemContext = React.createContext();

// Enhanced TabSystem with context
export const TabSystemProvider = ({ children }) => {
  const [tabs, setTabs] = useState([
    {
      id: 'dashboard',
      type: 'dashboard',
      title: 'Dashboard',
      namespace: 'all',
      closable: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('dashboard');
  const { getCurrentClusterInfo } = useCluster();

  const openTab = useCallback((resourceType, namespace = 'all', additionalParams = {}) => {
    const existingTab = tabs.find(tab => 
      tab.type === resourceType && tab.namespace === namespace
    );
    
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return existingTab;
    } else {
      const newTab = {
        id: Date.now(),
        type: resourceType,
        title: resourceType.charAt(0).toUpperCase() + resourceType.slice(1),
        namespace,
        closable: true,
        cluster: getCurrentClusterInfo()?.id,
        ...additionalParams
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      return newTab;
    }
  }, [tabs, getCurrentClusterInfo]);

  const closeTab = useCallback((tabId) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      if (tabId === activeTabId) {
        const closingTabIndex = prev.findIndex(tab => tab.id === tabId);
        const newActiveTab = newTabs[Math.max(0, closingTabIndex - 1)];
        setActiveTabId(newActiveTab?.id || newTabs[0]?.id);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const value = {
    tabs,
    activeTabId,
    activeTab: tabs.find(tab => tab.id === activeTabId),
    openTab,
    closeTab,
    setActiveTabId
  };

  return (
    <TabSystemContext.Provider value={value}>
      {children}
    </TabSystemContext.Provider>
  );
};

export default ModernTabSystem; 