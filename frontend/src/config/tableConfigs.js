import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Server, Globe, Shield, Database } from 'lucide-react';

// Status badge component for reuse
const StatusBadge = ({ status, hasErrors }) => {
  const getStatusColor = () => {
    if (hasErrors) return 'bg-red-100 text-red-800';
    
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
      case 'ready':
      case 'bound':
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'creating':
      case 'terminating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'error':
      case 'crashloopbackoff':
        return 'bg-red-100 text-red-800';
      case 'unknown':
      case 'notready':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getIcon = () => {
    if (hasErrors) return <XCircle className="w-3 h-3" />;
    
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
      case 'ready':
      case 'bound':
      case 'available':
        return <CheckCircle className="w-3 h-3" />;
      case 'pending':
      case 'creating':
      case 'terminating':
        return <Clock className="w-3 h-3" />;
      case 'failed':
      case 'error':
      case 'crashloopbackoff':
        return <XCircle className="w-3 h-3" />;
      case 'unknown':
      case 'notready':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-current" />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {getIcon()}
      {status || 'Unknown'}
    </span>
  );
};

// Age formatter
const formatAge = (age) => {
  if (!age) return 'Unknown';
  return age;
};

// Resource link component
const ResourceLink = ({ name, onClick }) => (
  <button
    onClick={onClick}
    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
  >
    {name}
  </button>
);

export const tableConfigs = {
  pods: {
    columns: [
      {
        key: 'name',
        label: 'Name',
        defaultSize: 25,
        minSize: 15,
        sortable: true,
        render: (value, resource) => (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium">{value}</span>
          </div>
        )
      },
      {
        key: 'namespace',
        label: 'Namespace',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
            {value}
          </span>
        )
      },
      {
        key: 'status',
        label: 'Status',
        defaultSize: 15,
        minSize: 12,
        sortable: true,
        render: (value, resource) => (
          <StatusBadge status={value} hasErrors={resource.hasErrors} />
        )
      },
      {
        key: 'ready',
        label: 'Ready',
        defaultSize: 10,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{value}</span>
        )
      },
      {
        key: 'restarts',
        label: 'Restarts',
        defaultSize: 10,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className={`font-mono text-sm ${value > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
            {value}
          </span>
        )
      },
      {
        key: 'age',
        label: 'Age',
        defaultSize: 12,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{formatAge(value)}</span>
        )
      },
      {
        key: 'node',
        label: 'Node',
        defaultSize: 13,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm flex items-center gap-1">
            <Server className="w-3 h-3" />
            {value || 'N/A'}
          </span>
        )
      }
    ]
  },

  deployments: {
    columns: [
      {
        key: 'name',
        label: 'Name',
        defaultSize: 25,
        minSize: 15,
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-medium">{value}</span>
          </div>
        )
      },
      {
        key: 'namespace',
        label: 'Namespace',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
            {value}
          </span>
        )
      },
      {
        key: 'ready',
        label: 'Ready',
        defaultSize: 12,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{value}</span>
        )
      },
      {
        key: 'upToDate',
        label: 'Up-to-date',
        defaultSize: 12,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{value}</span>
        )
      },
      {
        key: 'available',
        label: 'Available',
        defaultSize: 12,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{value}</span>
        )
      },
      {
        key: 'age',
        label: 'Age',
        defaultSize: 12,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{formatAge(value)}</span>
        )
      },
      {
        key: 'strategy',
        label: 'Strategy',
        defaultSize: 12,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{value || 'RollingUpdate'}</span>
        )
      }
    ]
  },

  services: {
    columns: [
      {
        key: 'name',
        label: 'Name',
        defaultSize: 25,
        minSize: 15,
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-500" />
            <span className="font-medium">{value}</span>
          </div>
        )
      },
      {
        key: 'namespace',
        label: 'Namespace',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
            {value}
          </span>
        )
      },
      {
        key: 'type',
        label: 'Type',
        defaultSize: 12,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            value === 'LoadBalancer' ? 'bg-blue-100 text-blue-800' :
            value === 'NodePort' ? 'bg-purple-100 text-purple-800' :
            value === 'ClusterIP' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {value}
          </span>
        )
      },
      {
        key: 'clusterIP',
        label: 'Cluster IP',
        defaultSize: 15,
        minSize: 12,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{value || 'None'}</span>
        )
      },
      {
        key: 'ports',
        label: 'Ports',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">
            {Array.isArray(value) ? value.join(', ') : (value || 'N/A')}
          </span>
        )
      },
      {
        key: 'age',
        label: 'Age',
        defaultSize: 12,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{formatAge(value)}</span>
        )
      }
    ]
  },

  nodes: {
    columns: [
      {
        key: 'name',
        label: 'Name',
        defaultSize: 25,
        minSize: 15,
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-orange-500" />
            <span className="font-medium">{value}</span>
          </div>
        )
      },
      {
        key: 'status',
        label: 'Status',
        defaultSize: 15,
        minSize: 12,
        sortable: true,
        render: (value) => (
          <StatusBadge status={value} />
        )
      },
      {
        key: 'roles',
        label: 'Roles',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="text-sm">
            {Array.isArray(value) ? value.join(', ') : (value || 'worker')}
          </span>
        )
      },
      {
        key: 'age',
        label: 'Age',
        defaultSize: 12,
        minSize: 8,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{formatAge(value)}</span>
        )
      },
      {
        key: 'version',
        label: 'Version',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{value}</span>
        )
      },
      {
        key: 'cpu',
        label: 'CPU',
        defaultSize: 10,
        minSize: 8,
        render: (value, resource) => (
          <span className="text-sm">{resource.resources?.cpuUsage || 'N/A'}</span>
        )
      },
      {
        key: 'memory',
        label: 'Memory',
        defaultSize: 12,
        minSize: 8,
        render: (value, resource) => (
          <span className="text-sm">{resource.resources?.memUsage || 'N/A'}</span>
        )
      }
    ]
  },

  configmaps: {
    columns: [
      {
        key: 'name',
        label: 'Name',
        defaultSize: 30,
        minSize: 20,
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{value}</span>
          </div>
        )
      },
      {
        key: 'namespace',
        label: 'Namespace',
        defaultSize: 20,
        minSize: 15,
        sortable: true,
        render: (value) => (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
            {value}
          </span>
        )
      },
      {
        key: 'data',
        label: 'Data',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value, resource) => (
          <span className="text-sm text-gray-600">
            {resource.dataCount || Object.keys(value || {}).length} keys
          </span>
        )
      },
      {
        key: 'age',
        label: 'Age',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{formatAge(value)}</span>
        )
      }
    ]
  },

  secrets: {
    columns: [
      {
        key: 'name',
        label: 'Name',
        defaultSize: 30,
        minSize: 20,
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-medium">{value}</span>
          </div>
        )
      },
      {
        key: 'namespace',
        label: 'Namespace',
        defaultSize: 20,
        minSize: 15,
        sortable: true,
        render: (value) => (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
            {value}
          </span>
        )
      },
      {
        key: 'type',
        label: 'Type',
        defaultSize: 20,
        minSize: 15,
        sortable: true,
        render: (value) => (
          <span className="text-sm text-gray-600">{value || 'Opaque'}</span>
        )
      },
      {
        key: 'data',
        label: 'Data',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value, resource) => (
          <span className="text-sm text-gray-600">
            {resource.dataCount || Object.keys(value || {}).length} keys
          </span>
        )
      },
      {
        key: 'age',
        label: 'Age',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{formatAge(value)}</span>
        )
      }
    ]
  },

  // Generic configuration for other resource types
  generic: {
    columns: [
      {
        key: 'name',
        label: 'Name',
        defaultSize: 30,
        minSize: 20,
        sortable: true,
        render: (value) => (
          <span className="font-medium">{value}</span>
        )
      },
      {
        key: 'namespace',
        label: 'Namespace',
        defaultSize: 20,
        minSize: 15,
        sortable: true,
        render: (value) => (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
            {value || 'N/A'}
          </span>
        )
      },
      {
        key: 'status',
        label: 'Status',
        defaultSize: 15,
        minSize: 12,
        sortable: true,
        render: (value, resource) => (
          value ? <StatusBadge status={value} hasErrors={resource.hasErrors} /> : 'N/A'
        )
      },
      {
        key: 'age',
        label: 'Age',
        defaultSize: 15,
        minSize: 10,
        sortable: true,
        render: (value) => (
          <span className="text-gray-600 text-sm">{formatAge(value)}</span>
        )
      }
    ]
  }
};

// Get configuration for a specific resource type
export const getTableConfig = (resourceType) => {
  return tableConfigs[resourceType] || tableConfigs.generic;
}; 