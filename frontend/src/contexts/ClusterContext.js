import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ClusterContext = createContext();

export const useCluster = () => {
  const context = useContext(ClusterContext);
  if (!context) {
    throw new Error('useCluster must be used within a ClusterProvider');
  }
  return context;
};

// Fallback clusters when backend is unavailable
const FALLBACK_CLUSTERS = [
  {
    id: 'current',
    name: 'Current Context',
    displayName: 'Current',
    status: 'unknown',
    currentContext: true,
    server: 'unknown'
  },
  {
    id: 'demo-dev',
    name: 'Demo Development',
    displayName: 'Demo Dev',
    status: 'available',
    currentContext: false,
    server: 'https://demo-dev.k8s.local'
  },
  {
    id: 'demo-prod',
    name: 'Demo Production', 
    displayName: 'Demo Prod',
    status: 'available',
    currentContext: false,
    server: 'https://demo-prod.k8s.local'
  }
];

export const ClusterProvider = ({ children }) => {
  const [currentCluster, setCurrentCluster] = useState('current');
  const [clusters, setClusters] = useState(FALLBACK_CLUSTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Fetch clusters from backend
  const fetchClusters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/clusters/');
      if (!response.ok) {
        throw new Error(`Failed to fetch clusters: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.clusters && data.clusters.length > 0) {
        const fetchedClusters = data.clusters.map(cluster => ({
          id: cluster.name,
          name: cluster.name,
          displayName: cluster.name.length > 20 ? 
            cluster.name.substring(0, 17) + '...' : 
            cluster.name,
          server: cluster.server,
          status: cluster.status,
          currentContext: cluster.current_context,
          namespace: cluster.namespace || 'default'
        }));
        
        setClusters(fetchedClusters);
        setCurrentCluster(data.current);
        setBackendAvailable(true);
        
        console.log('✅ Successfully loaded clusters from kubeconfig:', fetchedClusters.length);
      } else {
        console.warn('⚠️ No clusters found in kubeconfig, using fallback');
        setBackendAvailable(true);
        // Keep fallback clusters but mark backend as available
      }
      
    } catch (err) {
      console.error('❌ Failed to fetch clusters from backend:', err);
      setError(`Backend unavailable: ${err.message}`);
      setBackendAvailable(false);
      
      // Keep fallback clusters - don't override them
      console.log('📝 Using demo clusters (backend unavailable)');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get current cluster info
  const getCurrentClusterInfo = useCallback(() => {
    return clusters.find(cluster => cluster.id === currentCluster) || clusters[0];
  }, [currentCluster, clusters]);

  // Switch cluster
  const switchCluster = useCallback(async (clusterId) => {
    if (clusterId === currentCluster) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Only call backend API if backend is available and it's a real cluster
      if (backendAvailable && !clusterId.startsWith('demo-')) {
        const response = await fetch('/api/v1/clusters/switch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ context: clusterId }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to switch cluster: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Switched cluster successfully:', result.message);
      } else {
        console.log('Demo cluster switch or backend unavailable:', clusterId);
      }
      
      // Update current cluster
      setCurrentCluster(clusterId);
      
      // Update cluster statuses
      setClusters(prev => 
        prev.map(cluster => ({
          ...cluster,
          currentContext: cluster.id === clusterId,
          status: cluster.id === clusterId ? 'connected' : 'available'
        }))
      );
      
      // Clear any cached data when switching clusters
      window.dispatchEvent(new CustomEvent('cluster-changed', { 
        detail: { clusterId, clusterInfo: clusters.find(c => c.id === clusterId) }
      }));
      
    } catch (err) {
      setError(`Failed to switch to cluster: ${err.message}`);
      console.error('Cluster switch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentCluster, clusters, backendAvailable]);

  // Get API URL with cluster parameter
  const getApiUrl = useCallback((endpoint) => {
    const baseUrl = '/api/v1';
    if (currentCluster === 'current') {
      return `${baseUrl}${endpoint}`;
    }
    
    // Check if endpoint already has query parameters
    const hasQueryParams = endpoint.includes('?');
    const separator = hasQueryParams ? '&' : '?';
    return `${baseUrl}${endpoint}${separator}cluster=${currentCluster}`;
  }, [currentCluster]);

  // Check cluster connectivity
  const checkClusterStatus = useCallback(async (clusterId) => {
    try {
      const response = await fetch('/api/v1/health');
      return response.ok ? 'connected' : 'disconnected';
    } catch {
      return 'disconnected';
    }
  }, []);

  // Initialize clusters on mount
  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // Update cluster statuses periodically (only for current cluster)
  useEffect(() => {
    if (!currentCluster) return;

    const updateCurrentClusterStatus = async () => {
      const status = await checkClusterStatus(currentCluster);
      setClusters(prev => 
        prev.map(cluster => 
          cluster.id === currentCluster 
            ? { ...cluster, status }
            : cluster
        )
      );
    };

    // Update immediately and then every 30 seconds
    updateCurrentClusterStatus();
    const interval = setInterval(updateCurrentClusterStatus, 30000);
    
    return () => clearInterval(interval);
  }, [currentCluster, checkClusterStatus]);

  const value = {
    currentCluster,
    clusters,
    loading,
    error,
    backendAvailable,
    getCurrentClusterInfo,
    switchCluster,
    getApiUrl,
    checkClusterStatus,
    fetchClusters
  };

  return (
    <ClusterContext.Provider value={value}>
      {children}
    </ClusterContext.Provider>
  );
}; 