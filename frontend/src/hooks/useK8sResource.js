import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useEffect } from 'react';
import { useCluster } from '../contexts/ClusterContext';

// Optimized API service
const api = {
  get: async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await fetch(`/api/v1${url}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  post: async (url, data) => {
    const response = await fetch(`/api/v1${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  put: async (url, data) => {
    const response = await fetch(`/api/v1${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }
};

// Query keys factory for consistent cache management with cluster awareness
export const queryKeys = {
  health: (cluster) => ['health', cluster],
  namespaces: (cluster) => ['namespaces', cluster],
  resourceList: (resourceType, namespace, cluster) => ['resources', resourceType, namespace, cluster],
  resource: (resourceType, namespace, name, cluster) => ['resource', resourceType, namespace, name, cluster],
  podLogs: (namespace, name, container, lines, cluster) => ['podLogs', namespace, name, container, lines, cluster],
  aiAnalysis: (type, target) => ['aiAnalysis', type, target],
  aiChat: ['aiChat'],
};

// Health check hook
export const useHealth = () => {
  const { currentCluster, getApiUrl } = useCluster();
  
  return useQuery({
    queryKey: queryKeys.health(currentCluster),
    queryFn: () => fetch(getApiUrl('/health')).then(res => {
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json();
    }),
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Namespaces hook
export const useNamespaces = () => {
  const { currentCluster, getApiUrl } = useCluster();
  
  return useQuery({
    queryKey: queryKeys.namespaces(currentCluster),
    queryFn: () => fetch(getApiUrl('/k8s/namespaces')).then(res => {
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json();
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes - namespaces change rarely
    select: (data) => ['All Namespaces', ...data.map(ns => ns.name || ns)],
  });
};

// Generic resource list hook with intelligent caching
export const useK8sResource = (resourceType, namespace = 'all', options = {}) => {
  const { currentCluster, getApiUrl } = useCluster();
  
  const queryKey = useMemo(
    () => queryKeys.resourceList(resourceType, namespace, currentCluster),
    [resourceType, namespace, currentCluster]
  );

  const endpoint = useMemo(() => {
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
    return getApiUrl(baseEndpoint);
  }, [resourceType, namespace, getApiUrl]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json();
    },
    enabled: !!resourceType,
    staleTime: 30 * 1000, // 30 seconds
    select: useCallback((data) => {
      // Filter data on the client side if needed
      if (namespace !== 'All Namespaces' && namespace !== 'all' && Array.isArray(data)) {
        return data.filter(item => !item.namespace || item.namespace === namespace);
      }
      return data || [];
    }, [namespace]),
    ...options,
  });
};

// Individual resource hook for editing
export const useK8sResourceDetail = (resourceType, namespace, name) => {
  const { getApiUrl } = useCluster();
  
  return useQuery({
    queryKey: queryKeys.resource(resourceType, namespace, name),
    queryFn: () => fetch(getApiUrl(`/k8s/resource/${resourceType}/${namespace}/${name}`)).then(res => {
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json();
    }),
    enabled: !!(resourceType && namespace && name),
    staleTime: 60 * 1000, // 1 minute
  });
};

// Pod logs hook
export const usePodLogs = (namespace, name, container, lines = 100) => {
  const { getApiUrl } = useCluster();
  
  return useQuery({
    queryKey: queryKeys.podLogs(namespace, name, container, lines),
    queryFn: () => fetch(getApiUrl(`/k8s/pods/${namespace}/${name}/logs?container=${container}&lines=${lines}`)).then(res => {
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json();
    }),
    enabled: !!(namespace && name && container),
    staleTime: 10 * 1000, // 10 seconds - logs change frequently
    select: (data) => data.logs ? data.logs.join('\n') : 'No logs available',
  });
};

// Mutation hooks with optimistic updates
export const useUpdateResource = () => {
  const queryClient = useQueryClient();
  const { getApiUrl } = useCluster();

  return useMutation({
    mutationFn: ({ resourceType, namespace, name, content }) =>
      fetch(getApiUrl('/k8s/resource'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType, namespace, name, content }),
      }).then(res => {
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
      }),
    onMutate: async ({ resourceType, namespace, name, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.resource(resourceType, namespace, name),
      });

      // Snapshot previous value
      const previousResource = queryClient.getQueryData(
        queryKeys.resource(resourceType, namespace, name)
      );

      // Optimistically update the resource
      queryClient.setQueryData(
        queryKeys.resource(resourceType, namespace, name),
        { yaml: content }
      );

      return { previousResource };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousResource) {
        queryClient.setQueryData(
          queryKeys.resource(variables.resourceType, variables.namespace, variables.name),
          context.previousResource
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.resource(variables.resourceType, variables.namespace, variables.name),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.resourceList(variables.resourceType, variables.namespace),
      });
    },
  });
};

// AI Analysis hook
export const useAIAnalysis = () => {
  const queryClient = useQueryClient();
  const { getApiUrl } = useCluster();

  return useMutation({
    mutationFn: ({ type, data }) => {
      if (type === 'pod') {
        return fetch(getApiUrl('/ai/analyze/pod'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            podName: data.name,
            namespace: data.namespace,
            podData: data,
          }),
        }).then(res => {
          if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
          return res.json();
        });
      } else {
        return fetch(getApiUrl('/ai/analyze/cluster'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then(res => {
          if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
          return res.json();
        });
      }
    },
    onSuccess: (data, variables) => {
      // Cache the analysis result
      queryClient.setQueryData(
        queryKeys.aiAnalysis(variables.type, variables.data),
        data
      );
    },
  });
};

// AI Chat hook
export const useAIChat = () => {
  const { getApiUrl } = useCluster();
  
  return useMutation({
    mutationFn: ({ message, context }) =>
      fetch(getApiUrl('/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      }).then(res => {
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
      }),
  });
};

// Resource refresh hook - invalidates and refetches specific resource types
export const useRefreshResource = () => {
  const queryClient = useQueryClient();

  return useCallback((resourceType, namespace) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.resourceList(resourceType, namespace),
    });
  }, [queryClient]);
};

// Bulk prefetch hook for preloading data
export const usePrefetchResources = () => {
  const queryClient = useQueryClient();
  const { getApiUrl } = useCluster();

  return useCallback((resourceTypes, namespace) => {
    resourceTypes.forEach(resourceType => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.resourceList(resourceType, namespace),
        queryFn: () => {
          const ns = namespace === 'All Namespaces' ? 'all' : namespace;
          const needsNamespace = !['nodes', 'namespaces', 'persistentvolumes', 'storageclasses', 'clusterroles', 'clusterrolebindings'].includes(resourceType);
          const baseEndpoint = needsNamespace ? `/k8s/${resourceType}?namespace=${ns}` : `/k8s/${resourceType}`;
          const endpoint = getApiUrl(baseEndpoint);
          return fetch(endpoint).then(res => {
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            return res.json();
          });
        },
        staleTime: 30 * 1000,
      });
    });
  }, [queryClient, getApiUrl]);
};

// Additional hooks for modal components
export const useGetResourceYaml = (resourceType, namespace, name) => {
  const { getApiUrl } = useCluster();
  
  return useQuery({
    queryKey: [...queryKeys.resource(resourceType, namespace, name), 'yaml'],
    queryFn: () => fetch(getApiUrl(`/k8s/resource/${resourceType}/${namespace}/${name}/yaml`)).then(res => {
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json();
    }),
    enabled: !!(resourceType && namespace && name),
    staleTime: 60 * 1000, // 1 minute
    select: (data) => data.yaml || data,
  });
};

export const useEditResource = () => {
  const queryClient = useQueryClient();
  const { getApiUrl } = useCluster();

  return useMutation({
    mutationFn: ({ resourceType, namespace, name, yaml }) =>
      fetch(getApiUrl(`/k8s/resource/${resourceType}/${namespace}/${name}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml }),
      }).then(res => {
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
      }),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.resource(variables.resourceType, variables.namespace, variables.name),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.resourceList(variables.resourceType, variables.namespace),
      });
    },
  });
}; 