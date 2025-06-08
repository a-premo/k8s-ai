import React, { useMemo } from 'react';
import { useK8sResourceDetail } from '../hooks/useK8sResource';

const ResourceDetailModal = React.memo(({ resource, resourceType, onClose }) => {
  // Fetch detailed resource data
  const { data: detailData, isLoading, error } = useK8sResourceDetail(
    resourceType,
    resource.namespace,
    resource.name
  );

  // Memoized YAML content
  const yamlContent = useMemo(() => {
    if (detailData?.yaml) {
      return detailData.yaml;
    }
    return 'Loading resource details...';
  }, [detailData]);

  // Memoized resource metadata
  const metadata = useMemo(() => {
    if (!resource) return {};
    
    return {
      'Name': resource.name,
      'Namespace': resource.namespace || 'N/A',
      'Status': resource.status,
      'Created': resource.creationTimestamp ? new Date(resource.creationTimestamp).toLocaleString() : 'N/A',
      'Labels': resource.labels ? Object.entries(resource.labels).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None',
      'Annotations': resource.annotations ? Object.keys(resource.annotations).length : 0,
    };
  }, [resource]);

  // Resource-specific additional info
  const additionalInfo = useMemo(() => {
    switch (resourceType) {
      case 'pods':
        return {
          'Node': resource.nodeName || 'N/A',
          'Pod IP': resource.podIP || 'N/A',
          'Ready Containers': `${resource.readyContainers || 0}/${resource.totalContainers || 0}`,
          'Restarts': resource.restarts || 0,
          'QoS Class': resource.qosClass || 'N/A',
        };
      
      case 'services':
        return {
          'Type': resource.type || 'N/A',
          'Cluster IP': resource.clusterIP || 'N/A',
          'External IP': resource.externalIP || 'N/A',
          'Ports': resource.ports ? resource.ports.map(p => `${p.port}:${p.targetPort}/${p.protocol}`).join(', ') : 'N/A',
          'Session Affinity': resource.sessionAffinity || 'None',
        };
      
      case 'deployments':
        return {
          'Replicas': `${resource.readyReplicas || 0}/${resource.replicas || 0}`,
          'Updated Replicas': resource.updatedReplicas || 0,
          'Available Replicas': resource.availableReplicas || 0,
          'Strategy': resource.strategy || 'RollingUpdate',
        };
      
      case 'nodes':
        return {
          'Roles': Array.isArray(resource.roles) ? resource.roles.join(', ') : (resource.roles || 'N/A'),
          'Version': resource.version || 'N/A',
          'OS': resource.osImage || 'N/A',
          'Kernel': resource.kernelVersion || 'N/A',
          'Container Runtime': resource.containerRuntime || 'N/A',
          'CPU': resource.cpu || 'N/A',
          'Memory': resource.memory || 'N/A',
        };
      
      default:
        return {};
    }
  }, [resource, resourceType]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="resource-detail-modal">
        <div className="modal-header">
          <h2>Resource Details: {resource.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {/* Resource Information Tabs */}
          <div className="detail-tabs">
            <div className="tab-content">
              {/* Overview Tab */}
              <div className="tab-panel overview-panel">
                <h3>Overview</h3>
                <div className="info-grid">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="info-item">
                      <span className="info-label">{key}:</span>
                      <span className="info-value">{value}</span>
                    </div>
                  ))}
                </div>
                
                {Object.keys(additionalInfo).length > 0 && (
                  <>
                    <h4>Additional Information</h4>
                    <div className="info-grid">
                      {Object.entries(additionalInfo).map(([key, value]) => (
                        <div key={key} className="info-item">
                          <span className="info-label">{key}:</span>
                          <span className="info-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {/* YAML Tab */}
              <div className="tab-panel yaml-panel">
                <h3>YAML Definition</h3>
                {isLoading ? (
                  <div className="loading-spinner">Loading YAML...</div>
                ) : error ? (
                  <div className="error-message">Error loading YAML: {error.message}</div>
                ) : (
                  <pre className="yaml-content">
                    <code>{yamlContent}</code>
                  </pre>
                )}
              </div>
              
              {/* Events Tab (for supported resources) */}
              {['pods', 'deployments', 'services'].includes(resourceType) && (
                <div className="tab-panel events-panel">
                  <h3>Events</h3>
                  <div className="events-list">
                    {resource.events && resource.events.length > 0 ? (
                      resource.events.map((event, index) => (
                        <div key={index} className="event-item">
                          <span className="event-type">{event.type}</span>
                          <span className="event-reason">{event.reason}</span>
                          <span className="event-message">{event.message}</span>
                          <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="no-events">No events available</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .resource-detail-modal {
          background: white;
          border-radius: 8px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 1.5rem;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.15s ease;
        }
        
        .close-button:hover {
          background-color: #f3f4f6;
        }
        
        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .tab-panel h3 {
          margin: 0 0 20px 0;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }
        
        .tab-panel h4 {
          margin: 20px 0 10px 0;
          color: #374151;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .info-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .info-value {
          color: #1f2937;
          font-family: monospace;
          background: #f9fafb;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          word-break: break-all;
        }
        
        .yaml-content {
          background: #1f2937;
          color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          overflow-x: auto;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          max-height: 400px;
          margin: 0;
        }
        
        .yaml-content code {
          background: none;
          padding: 0;
          color: inherit;
        }
        
        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        
        .error-message {
          color: #dc2626;
          padding: 20px;
          background: #fee2e2;
          border-radius: 6px;
          border: 1px solid #fecaca;
        }
        
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .event-item {
          display: grid;
          grid-template-columns: 80px 120px 1fr 150px;
          gap: 10px;
          padding: 10px;
          background: #f9fafb;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          align-items: start;
          font-size: 0.875rem;
        }
        
        .event-type {
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 12px;
          text-align: center;
          font-size: 0.75rem;
        }
        
        .event-reason {
          font-weight: 500;
          color: #374151;
        }
        
        .event-message {
          color: #6b7280;
        }
        
        .event-time {
          color: #9ca3af;
          font-size: 0.75rem;
        }
        
        .no-events {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-style: italic;
        }
        
        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }
        
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #d1d5db;
        }
        
        .btn-secondary {
          background: #f9fafb;
          color: #374151;
        }
        
        .btn-secondary:hover {
          background: #f3f4f6;
        }
        
        @media (max-width: 768px) {
          .resource-detail-modal {
            margin: 10px;
            max-height: calc(100vh - 20px);
          }
          
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .event-item {
            grid-template-columns: 1fr;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
});

ResourceDetailModal.displayName = 'ResourceDetailModal';

export default ResourceDetailModal; 