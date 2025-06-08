import React, { useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import './VirtualTable.css';

const VirtualTable = React.memo(({
  data = [],
  columns = [],
  onRowClick,
  onActionClick,
  rowActions = [],
  loading = false,
  error = null,
  estimateSize = 60,
  overscan = 5,
  className = '',
}) => {
  const parentRef = React.useRef();

  // Memoize the filtered and processed data
  const processedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map((item, index) => ({
      ...item,
      _index: index,
      _id: item.id || item.name || `row-${index}`,
    }));
  }, [data]);

  // Virtual row renderer
  const rowVirtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  // Memoized row click handler
  const handleRowClick = useCallback((item, event) => {
    if (event.target.closest('.action-button')) {
      return; // Don't trigger row click if clicking on action button
    }
    onRowClick?.(item);
  }, [onRowClick]);

  // Memoized action click handler
  const handleActionClick = useCallback((action, item, event) => {
    event.stopPropagation();
    onActionClick?.(action, item);
  }, [onActionClick]);

  // Render cell content with memoization
  const renderCell = useCallback((item, column) => {
    if (column.render) {
      return column.render(item);
    }
    
    const value = column.accessor ? item[column.accessor] : '';
    
    if (column.type === 'status') {
      return (
        <span className={`status-badge status-${value?.toLowerCase()}`}>
          {value}
        </span>
      );
    }
    
    if (column.type === 'timestamp') {
      return value ? new Date(value).toLocaleString() : '-';
    }
    
    if (column.type === 'clickable') {
      return (
        <button 
          className="clickable-cell"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(item, e);
          }}
        >
          {value}
        </button>
      );
    }
    
    return value || '-';
  }, [handleRowClick]);

  if (loading) {
    return (
      <div className="virtual-table-loading">
        <div className="spinner"></div>
        <span>Loading resources...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="virtual-table-error">
        <span>Error: {error.message || 'Failed to load data'}</span>
      </div>
    );
  }

  if (processedData.length === 0) {
    return (
      <div className="virtual-table-empty">
        <span>No resources found</span>
      </div>
    );
  }

  return (
    <div className={`virtual-table ${className}`}>
      {/* Table Header */}
      <div className="virtual-table-header">
        {columns.map((column, index) => (
          <div
            key={column.key || column.accessor || index}
            className="virtual-table-header-cell"
            style={{ width: column.width || 'auto', minWidth: column.minWidth || '100px' }}
          >
            {column.header}
          </div>
        ))}
        {rowActions.length > 0 && (
          <div className="virtual-table-header-cell actions-header">
            Actions
          </div>
        )}
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="virtual-table-body"
        style={{
          height: '400px', // Fixed height for virtualization
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const item = processedData[virtualItem.index];
            
            return (
              <div
                key={item._id}
                className={`virtual-table-row ${onRowClick ? 'clickable' : ''}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                onClick={(e) => handleRowClick(item, e)}
              >
                {columns.map((column, index) => (
                  <div
                    key={column.key || column.accessor || index}
                    className="virtual-table-cell"
                    style={{ width: column.width || 'auto', minWidth: column.minWidth || '100px' }}
                  >
                    {renderCell(item, column)}
                  </div>
                ))}
                
                {rowActions.length > 0 && (
                  <div className="virtual-table-cell actions-cell">
                    {rowActions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        className={`action-button ${action.variant || 'default'}`}
                        onClick={(e) => handleActionClick(action, item, e)}
                        disabled={action.disabled?.(item)}
                        title={action.tooltip?.(item)}
                      >
                        {action.icon && <span className="action-icon">{action.icon}</span>}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

VirtualTable.displayName = 'VirtualTable';

export default VirtualTable; 