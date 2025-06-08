import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useK8sResource, useNamespaces } from './useK8sResource';
import { useMemo, useEffect } from 'react';
import { useCluster } from '../contexts/ClusterContext';

// Unified hook that fetches all K8s resources
export const useK8sResources = (namespace = 'all') => {
  const queryClient = useQueryClient();
  const { currentCluster, getApiUrl } = useCluster();
  
  // List of all resource types we want to fetch
  const resourceTypes = [
    'pods',
    'deployments',
    'services',
    'nodes',
    'configmaps',
    'secrets',
    'persistentvolumes',
    'persistentvolumeclaims',
    'ingresses',
    'replicasets',
    'statefulsets',
    'daemonsets',
    'jobs',
    'cronjobs',
    'serviceaccounts',
    'endpoints',
    'networkpolicies',
    'storageclasses',
    'roles',
    'clusterroles',
    'rolebindings',
    'clusterrolebindings',
    'events'
  ];

  // Get namespaces
  const { data: namespaces } = useNamespaces();

  // Use useQueries to fetch all resources in parallel
  const queries = useQueries({
    queries: resourceTypes.map(resourceType => ({
      queryKey: ['resources', resourceType, namespace, currentCluster],
      queryFn: async () => {
        const ns = namespace === 'All Namespaces' || namespace === 'all' ? 'all' : namespace;
        const clusterLevelResources = [
          'nodes', 
          'namespaces', 
          'persistentvolumes', 
          'storageclasses', 
          'clusterroles', 
          'clusterrolebindings'
        ];
        const needsNamespace = !clusterLevelResources.includes(resourceType);
        const baseEndpoint = needsNamespace ? `/k8s/${resourceType}?namespace=${ns}` : `/k8s/${resourceType}`;
        const endpoint = getApiUrl(baseEndpoint);
        
        try {
          const response = await fetch(endpoint);
          if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (error) {
          console.warn(`Failed to fetch ${resourceType}:`, error);
          return [];
        }
      },
      staleTime: 30 * 1000, // 30 seconds
      enabled: true,
      retry: (failureCount, error) => {
        // Don't retry on 404s or after 2 failures
        if (error?.message?.includes('404') || failureCount >= 2) {
          return false;
        }
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })),
  });

  // Combine all the results
  const combinedData = useMemo(() => {
    const result = {
      namespaces: namespaces || [],
    };

    // Map each query result to its resource type
    resourceTypes.forEach((resourceType, index) => {
      const query = queries[index];
      result[resourceType] = query.data || [];
    });

    return result;
  }, [queries, namespaces]);

  // Calculate loading and error states
  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const errors = queries.filter(query => query.error).map(query => query.error);

  // Create a combined error if any queries failed
  const error = isError ? new Error(
    `Failed to load some resources: ${errors.map(e => e.message).join(', ')}`
  ) : null;

  // Refetch function that refetches all resources
  const refetch = () => {
    queries.forEach(query => {
      query.refetch();
    });
  };

  // Listen for cluster changes and invalidate/refetch data
  useEffect(() => {
    const handleClusterChange = (event) => {
      console.log('🔄 Cluster changed, refreshing resource data...', event.detail);
      
      // Invalidate all resource queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      
      // Force refetch current queries
      refetch();
    };

    // Listen for cluster change events
    window.addEventListener('cluster-changed', handleClusterChange);
    
    return () => {
      window.removeEventListener('cluster-changed', handleClusterChange);
    };
  }, [queryClient, refetch]);

  return {
    data: combinedData,
    isLoading,
    error,
    refetch,
    // Individual query states for debugging
    queries,
  };
};

// Re-export the WebSocket hook for convenience
export { useWebSocket, useK8sWebSocket } from './useWebSocket'; 