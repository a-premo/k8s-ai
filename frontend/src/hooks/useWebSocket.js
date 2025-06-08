import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useK8sResource';

export const useWebSocket = (url, options = {}) => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onError,
    onOpen,
    onClose,
    enabled = true,
  } = options;

  const ws = useRef(null);
  const reconnectTimeoutId = useRef(null);
  const reconnectCount = useRef(0);
  const queryClient = useQueryClient();
  
  const [connectionState, setConnectionState] = useState({
    readyState: WebSocket.CONNECTING,
    lastMessage: null,
    lastError: null,
  });

  const connect = useCallback(() => {
    if (!enabled || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = (event) => {
        console.log('WebSocket connected:', url);
        setConnectionState(prev => ({ ...prev, readyState: WebSocket.OPEN }));
        reconnectCount.current = 0;
        onOpen?.(event);
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setConnectionState(prev => ({ ...prev, lastMessage: message }));
        
        // Handle real-time K8s updates
        handleRealtimeUpdate(message);
        
        onMessage?.(message);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState(prev => ({ ...prev, lastError: error }));
        onError?.(error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState(prev => ({ ...prev, readyState: WebSocket.CLOSED }));
        
        // Attempt to reconnect if not manually closed
        if (enabled && event.code !== 1000 && reconnectCount.current < maxReconnectAttempts) {
          reconnectCount.current++;
          reconnectTimeoutId.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectCount.current}/${maxReconnectAttempts})`);
            connect();
          }, reconnectInterval);
        }
        
        onClose?.(event);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState(prev => ({ ...prev, lastError: error }));
    }
  }, [url, enabled, reconnectInterval, maxReconnectAttempts, onOpen, onMessage, onError, onClose]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket is not open. Message not sent:', message);
    return false;
  }, []);

  // Handle real-time K8s resource updates
  const handleRealtimeUpdate = useCallback((message) => {
    const { type, resourceType, namespace, data } = message;
    
    switch (type) {
      case 'RESOURCE_UPDATED':
      case 'RESOURCE_CREATED':
        // Invalidate the resource list to refresh data
        queryClient.invalidateQueries({
          queryKey: queryKeys.resourceList(resourceType, namespace),
        });
        
        // If we have the individual resource cached, update it
        if (data?.name) {
          queryClient.setQueryData(
            queryKeys.resource(resourceType, namespace, data.name),
            data
          );
        }
        break;
        
      case 'RESOURCE_DELETED':
        // Remove the resource from cache and invalidate lists
        if (data?.name) {
          queryClient.removeQueries({
            queryKey: queryKeys.resource(resourceType, namespace, data.name),
          });
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.resourceList(resourceType, namespace),
        });
        break;
        
      case 'POD_STATUS_CHANGED':
        // Update pod-specific data
        queryClient.invalidateQueries({
          queryKey: queryKeys.resourceList('pods', namespace),
        });
        
        // Clear logs cache as pod status change might affect logs
        if (data?.name) {
          queryClient.removeQueries({
            queryKey: queryKeys.podLogs(namespace, data.name),
          });
        }
        break;
        
      case 'NAMESPACE_CREATED':
      case 'NAMESPACE_DELETED':
        // Refresh namespaces list
        queryClient.invalidateQueries({
          queryKey: queryKeys.namespaces,
        });
        break;
        
      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }, [queryClient]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    sendMessage,
    disconnect,
    connect,
    connectionState,
    isConnected: connectionState.readyState === WebSocket.OPEN,
    isConnecting: connectionState.readyState === WebSocket.CONNECTING,
    lastMessage: connectionState.lastMessage,
    lastError: connectionState.lastError,
  };
};

// Specialized hook for K8s real-time updates
export const useK8sWebSocket = (options = {}) => {
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/ws`;
  
  return useWebSocket(wsUrl, {
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
    enabled: false, // Temporarily disabled to prevent console errors
    ...options,
  });
}; 