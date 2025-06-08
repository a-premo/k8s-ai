import { useRef, useCallback, useState, useEffect } from 'react';

export const useDataWorker = () => {
  const workerRef = useRef(null);
  const pendingOperations = useRef(new Map());
  const operationIdCounter = useRef(0);
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  // Initialize worker
  useEffect(() => {
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker('/dataWorker.js');
        
        workerRef.current.onmessage = (e) => {
          const { id, type, success, data, error, progress } = e.data;
          
          if (type === 'progress') {
            // Handle progress updates
            const operation = pendingOperations.current.get(id);
            if (operation?.onProgress) {
              operation.onProgress({ progress, processed: e.data.processed });
            }
            return;
          }
          
          // Handle operation results
          const operation = pendingOperations.current.get(id);
          if (operation) {
            if (success) {
              operation.resolve(data);
            } else {
              operation.reject(new Error(error));
            }
            pendingOperations.current.delete(id);
          }
        };
        
        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error);
          // Reject all pending operations
          pendingOperations.current.forEach(({ reject }) => {
            reject(new Error('Worker error occurred'));
          });
          pendingOperations.current.clear();
        };
        
        setIsWorkerReady(true);
      } catch (error) {
        console.error('Failed to create worker:', error);
        setIsWorkerReady(false);
      }
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        setIsWorkerReady(false);
        pendingOperations.current.clear();
      }
    };
  }, []);

  // Generic worker operation executor
  const executeOperation = useCallback((type, data, config = {}, onProgress = null) => {
    return new Promise((resolve, reject) => {
      if (!isWorkerReady || !workerRef.current) {
        reject(new Error('Worker not ready'));
        return;
      }
      
      const operationId = ++operationIdCounter.current;
      
      // Store the operation callbacks
      pendingOperations.current.set(operationId, {
        resolve,
        reject,
        onProgress,
      });
      
      // Send operation to worker
      workerRef.current.postMessage({
        id: operationId,
        type,
        data,
        config,
      });
    });
  }, [isWorkerReady]);

  // Specific operation methods
  const parseYAML = useCallback((yamlString) => {
    return executeOperation('parseYAML', yamlString);
  }, [executeOperation]);

  const filterResources = useCallback((resources, filters, onProgress = null) => {
    return executeOperation('filterResources', resources, { filters }, onProgress);
  }, [executeOperation]);

  const sortResources = useCallback((resources, sortConfig) => {
    return executeOperation('sortResources', resources, { sortConfig });
  }, [executeOperation]);

  const aggregateMetrics = useCallback((resources, metricsConfig = {}) => {
    return executeOperation('aggregateMetrics', resources, { metricsConfig });
  }, [executeOperation]);

  const processLargeDataset = useCallback((data, processingConfig, onProgress = null) => {
    return executeOperation('processLargeDataset', data, processingConfig, onProgress);
  }, [executeOperation]);

  return {
    isWorkerReady,
    parseYAML,
    filterResources,
    sortResources,
    aggregateMetrics,
    processLargeDataset,
    executeOperation,
  };
};

// Hook for filtering resources with web worker
export const useResourceFilter = (resources = [], initialFilters = {}) => {
  const { filterResources, isWorkerReady } = useDataWorker();
  const [filters, setFilters] = useState(initialFilters);
  const [filteredResources, setFilteredResources] = useState(resources);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterError, setFilterError] = useState(null);

  // Debounced filter application
  const applyFilters = useCallback(async () => {
    if (!isWorkerReady || !resources.length) {
      setFilteredResources(resources);
      return;
    }

    setIsFiltering(true);
    setFilterError(null);

    try {
      const result = await filterResources(resources, filters);
      setFilteredResources(result);
    } catch (error) {
      console.error('Filter error:', error);
      setFilterError(error);
      setFilteredResources(resources); // Fallback to unfiltered data
    } finally {
      setIsFiltering(false);
    }
  }, [resources, filters, filterResources, isWorkerReady]);

  // Apply filters when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(applyFilters, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [applyFilters]);

  return {
    filteredResources,
    filters,
    setFilters,
    isFiltering,
    filterError,
    applyFilters,
  };
};

// Hook for sorting resources with web worker
export const useResourceSort = (resources = [], initialSort = { field: 'name', direction: 'asc' }) => {
  const { sortResources, isWorkerReady } = useDataWorker();
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [sortedResources, setSortedResources] = useState(resources);
  const [isSorting, setIsSorting] = useState(false);

  const applySort = useCallback(async () => {
    if (!isWorkerReady || !resources.length) {
      setSortedResources(resources);
      return;
    }

    setIsSorting(true);

    try {
      const result = await sortResources(resources, sortConfig);
      setSortedResources(result);
    } catch (error) {
      console.error('Sort error:', error);
      setSortedResources(resources); // Fallback to unsorted data
    } finally {
      setIsSorting(false);
    }
  }, [resources, sortConfig, sortResources, isWorkerReady]);

  useEffect(() => {
    applySort();
  }, [applySort]);

  const handleSort = useCallback((field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return {
    sortedResources,
    sortConfig,
    setSortConfig,
    handleSort,
    isSorting,
  };
};

// Hook for processing large datasets with progress tracking
export const useLargeDatasetProcessor = () => {
  const { processLargeDataset, isWorkerReady } = useDataWorker();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState(null);
  const [error, setError] = useState(null);

  const processData = useCallback(async (data, config) => {
    if (!isWorkerReady) {
      throw new Error('Worker not ready');
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setProcessedData(null);

    try {
      const result = await processLargeDataset(
        data,
        config,
        ({ progress: progressValue }) => {
          setProgress(progressValue);
        }
      );
      setProcessedData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, [processLargeDataset, isWorkerReady]);

  return {
    processData,
    isProcessing,
    progress,
    processedData,
    error,
    isWorkerReady,
  };
}; 