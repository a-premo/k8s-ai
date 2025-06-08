import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Loader } from 'lucide-react';

const ModernStatusBadge = React.memo(({ status, hasErrors, className = '' }) => {
  const getStatusConfig = () => {
    if (hasErrors) {
      return {
        color: 'failed',
        text: 'Failed',
        icon: XCircle,
        animated: true
      };
    }
    
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
      case 'ready':
      case 'bound':
      case 'available':
        return {
          color: 'running',
          text: status,
          icon: CheckCircle,
          animated: true
        };
      case 'pending':
      case 'creating':
      case 'terminating':
      case 'containerCreating':
        return {
          color: 'pending',
          text: status,
          icon: Clock,
          animated: true
        };
      case 'failed':
      case 'error':
      case 'crashloopbackoff':
      case 'imagepullbackoff':
        return {
          color: 'failed',
          text: status,
          icon: XCircle,
          animated: true
        };
      case 'unknown':
      case 'notready':
        return {
          color: 'unknown',
          text: status,
          icon: AlertTriangle,
          animated: false
        };
      default:
        return {
          color: 'default',
          text: status || 'Unknown',
          icon: Clock,
          animated: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`status-badge ${config.color} ${className}`}>
      <div className={`status-dot ${config.animated ? 'animate' : ''}`} />
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{config.text}</span>
    </span>
  );
});

ModernStatusBadge.displayName = 'ModernStatusBadge';

export default ModernStatusBadge; 