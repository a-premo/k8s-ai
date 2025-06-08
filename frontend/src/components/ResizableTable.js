import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronRight, MoreVertical, Edit, Trash2, Copy, RefreshCw } from 'lucide-react';
import ResourceDetail from './ResourceDetail';

const ResizableTable = React.memo(({ 
  data = [], 
  columns = [], 
  resourceType,
  loading = false,
  error = null,
  onRefresh,
  onEdit,
  onDelete,
  className = ''
}) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedResource, setSelectedResource] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [columnSizes, setColumnSizes] = useState(() => {
    const saved = localStorage.getItem(`table-columns-${resourceType}`);
    return saved ? JSON.parse(saved) : columns.map(col => col.defaultSize || 20);
  });

  const tableRef = useRef(null);
  const contextMenuRef = useRef(null);

  // Save column sizes to localStorage
  useEffect(() => {
    localStorage.setItem(`table-columns-${resourceType}`, JSON.stringify(columnSizes));
  }, [columnSizes, resourceType]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!tableRef.current || data.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedRowIndex(prev => Math.min(prev + 1, data.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedRowIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (data[focusedRowIndex]) {
            handleRowClick(data[focusedRowIndex], focusedRowIndex, e);
          }
          break;
        case 'Escape':
          setSelectedRows(new Set());
          setContextMenu(null);
          setSelectedResource(null);
          break;
        case ' ':
          e.preventDefault();
          handleRowSelect(focusedRowIndex, e);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedRowIndex, data]);

  const handleRowClick = useCallback((resource, index, event) => {
    event.stopPropagation();
    
    if (event.shiftKey) {
      handleRowSelect(index, event);
    } else if (event.ctrlKey || event.metaKey) {
      handleRowSelect(index, event);
    } else {
      setSelectedResource(resource);
      setFocusedRowIndex(index);
    }
  }, []);

  const handleRowSelect = useCallback((index, event) => {
    const newSelected = new Set(selectedRows);
    
    if (event.shiftKey && selectedRows.size > 0) {
      // Range selection
      const indices = Array.from(selectedRows);
      const start = Math.min(index, ...indices);
      const end = Math.max(index, ...indices);
      
      for (let i = start; i <= end; i++) {
        newSelected.add(i);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
    } else {
      // Single selection
      newSelected.clear();
      newSelected.add(index);
    }
    
    setSelectedRows(newSelected);
    setFocusedRowIndex(index);
  }, [selectedRows]);

  const handleContextMenu = useCallback((event, resource, index) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      resource,
      index
    });
    setFocusedRowIndex(index);
  }, []);

  const handleColumnResize = useCallback((newSizes) => {
    setColumnSizes(newSizes);
  }, []);

  const contextMenuItems = useMemo(() => [
    {
      label: 'View Details',
      icon: ChevronRight,
      action: (resource) => setSelectedResource(resource)
    },
    {
      label: 'Edit YAML',
      icon: Edit,
      action: (resource) => {
        setSelectedResource(resource);
        // Could directly open in edit mode
      }
    },
    {
      label: 'Copy Name',
      icon: Copy,
      action: (resource) => navigator.clipboard.writeText(resource.name)
    },
    { type: 'separator' },
    {
      label: 'Delete',
      icon: Trash2,
      action: (resource) => onDelete?.(resource),
      dangerous: true
    }
  ], [onDelete]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading resources</p>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No {resourceType} found</p>
          <p className="text-sm">Resources will appear here when available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${className}`}>
        <div 
          ref={tableRef}
          className="overflow-auto"
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          <table className="min-w-full">
            {/* Header with resizable columns */}
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <PanelGroup 
                  direction="horizontal" 
                  onLayout={handleColumnResize}
                  className="flex w-full"
                >
                  {columns.map((column, index) => (
                    <React.Fragment key={column.key}>
                      <Panel 
                        defaultSize={columnSizes[index] || column.defaultSize || 20}
                        minSize={column.minSize || 10}
                        maxSize={column.maxSize || 50}
                        className="flex"
                      >
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none cursor-pointer hover:bg-gray-100 transition-colors flex-1"
                          onDoubleClick={() => {
                            // Auto-fit column width
                            const newSizes = [...columnSizes];
                            newSizes[index] = column.defaultSize || 20;
                            setColumnSizes(newSizes);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{column.label}</span>
                            {column.sortable && (
                              <div className="flex flex-col ml-2">
                                <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-400"></div>
                                <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-400 mt-0.5"></div>
                              </div>
                            )}
                          </div>
                        </th>
                      </Panel>
                      
                      {index < columns.length - 1 && (
                        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize relative group">
                          <div className="absolute inset-y-0 left-0 w-1 group-hover:bg-blue-400 transition-colors"></div>
                        </PanelResizeHandle>
                      )}
                    </React.Fragment>
                  ))}
                </PanelGroup>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((resource, rowIndex) => {
                const isSelected = selectedRows.has(rowIndex);
                const isFocused = focusedRowIndex === rowIndex;
                
                return (
                  <tr
                    key={resource.uid || `${resource.namespace}-${resource.name}` || rowIndex}
                    onClick={(e) => handleRowClick(resource, rowIndex, e)}
                    onContextMenu={(e) => handleContextMenu(e, resource, rowIndex)}
                    className={`
                      transition-colors cursor-pointer select-none
                      ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
                      ${isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}
                    `}
                  >
                    <PanelGroup direction="horizontal" className="flex w-full">
                      {columns.map((column, colIndex) => (
                        <React.Fragment key={column.key}>
                          <Panel 
                            defaultSize={columnSizes[colIndex] || column.defaultSize || 20}
                            minSize={column.minSize || 10}
                            maxSize={column.maxSize || 50}
                            className="flex"
                          >
                            <td className="px-4 py-3 text-sm text-gray-900 truncate flex-1">
                              {column.render ? 
                                column.render(resource[column.key], resource, rowIndex) : 
                                resource[column.key] || '-'
                              }
                            </td>
                          </Panel>
                          
                          {colIndex < columns.length - 1 && (
                            <div className="w-1"></div>
                          )}
                        </React.Fragment>
                      ))}
                    </PanelGroup>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer with selection info */}
        {selectedRows.size > 0 && (
          <div className="bg-blue-50 border-t px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedRows.size} of {data.length} {resourceType} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRows(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
              <button
                onClick={() => {
                  const resources = Array.from(selectedRows).map(index => data[index]);
                  console.log('Bulk action on:', resources);
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Bulk Actions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-48"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            transform: 'translate(-50%, -10px)'
          }}
        >
          {contextMenuItems.map((item, index) => (
            item.type === 'separator' ? (
              <hr key={index} className="my-1 border-gray-200" />
            ) : (
              <button
                key={index}
                onClick={() => {
                  item.action(contextMenu.resource);
                  setContextMenu(null);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors
                  ${item.dangerous 
                    ? 'text-red-600 hover:bg-red-50' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          ))}
        </div>
      )}

      {/* Resource Detail Modal */}
      {selectedResource && (
        <ResourceDetail
          resource={selectedResource}
          resourceType={resourceType}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </>
  );
});

ResizableTable.displayName = 'ResizableTable';

export default ResizableTable; 