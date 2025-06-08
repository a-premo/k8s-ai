import React from 'react';
import { 
  Layers, 
  Box, 
  Network, 
  HardDrive, 
  Shield, 
  Settings, 
  Users, 
  Database,
  Cloud,
  Activity,
  Archive,
  FileText,
  Zap,
  Clock,
  Globe,
  Key,
  AlertTriangle,
  Calendar
} from 'lucide-react';

const ModernSidebar = ({ activeTab, onTabChange, resourceCounts = {} }) => {
  const workloadSections = [
    {
      title: 'Workloads',
      items: [
        { id: 'pods', label: 'Pods', icon: Box, count: resourceCounts.pods },
        { id: 'deployments', label: 'Deployments', icon: Layers, count: resourceCounts.deployments },
        { id: 'replicasets', label: 'ReplicaSets', icon: Archive, count: resourceCounts.replicasets },
        { id: 'statefulsets', label: 'StatefulSets', icon: Database, count: resourceCounts.statefulsets },
        { id: 'daemonsets', label: 'DaemonSets', icon: Activity, count: resourceCounts.daemonsets },
        { id: 'jobs', label: 'Jobs', icon: Zap, count: resourceCounts.jobs },
        { id: 'cronjobs', label: 'CronJobs', icon: Calendar, count: resourceCounts.cronjobs }
      ]
    },
    {
      title: 'Networking',
      items: [
        { id: 'services', label: 'Services', icon: Network, count: resourceCounts.services },
        { id: 'endpoints', label: 'Endpoints', icon: Globe, count: resourceCounts.endpoints },
        { id: 'ingresses', label: 'Ingresses', icon: Cloud, count: resourceCounts.ingresses },
        { id: 'networkpolicies', label: 'Network Policies', icon: Shield, count: resourceCounts.networkpolicies }
      ]
    },
    {
      title: 'Storage',
      items: [
        { id: 'persistentvolumes', label: 'Persistent Volumes', icon: HardDrive, count: resourceCounts.persistentvolumes },
        { id: 'persistentvolumeclaims', label: 'PV Claims', icon: Archive, count: resourceCounts.persistentvolumeclaims },
        { id: 'storageclasses', label: 'Storage Classes', icon: Database, count: resourceCounts.storageclasses }
      ]
    },
    {
      title: 'Config & Access',
      items: [
        { id: 'configmaps', label: 'ConfigMaps', icon: FileText, count: resourceCounts.configmaps },
        { id: 'secrets', label: 'Secrets', icon: Key, count: resourceCounts.secrets },
        { id: 'serviceaccounts', label: 'Service Accounts', icon: Users, count: resourceCounts.serviceaccounts },
        { id: 'roles', label: 'Roles', icon: Shield, count: resourceCounts.roles },
        { id: 'clusterroles', label: 'Cluster Roles', icon: Settings, count: resourceCounts.clusterroles },
        { id: 'rolebindings', label: 'Role Bindings', icon: Users, count: resourceCounts.rolebindings },
        { id: 'clusterrolebindings', label: 'Cluster Role Bindings', icon: Settings, count: resourceCounts.clusterrolebindings }
      ]
    },
    {
      title: 'Cluster',
      items: [
        { id: 'nodes', label: 'Nodes', icon: Settings, count: resourceCounts.nodes },
        { id: 'namespaces', label: 'Namespaces', icon: Layers, count: resourceCounts.namespaces },
        { id: 'events', label: 'Events', icon: AlertTriangle, count: resourceCounts.events }
      ]
    }
  ];

  const handleItemClick = (itemId) => {
    onTabChange(itemId);
  };

  return (
    <aside className="modern-sidebar w-64 h-full overflow-y-auto">
      <div className="p-6 space-y-8">
        {workloadSections.map((section, sectionIndex) => (
          <div key={section.title} className="animate-slide-in" style={{ animationDelay: `${sectionIndex * 0.1}s` }}>
            {/* Section Header */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            </div>

            {/* Section Items */}
            <nav className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`sidebar-nav-item w-full ${isActive ? 'active' : ''}`}
                    style={{ animationDelay: `${(sectionIndex * 0.1) + (itemIndex * 0.05)}s` }}
                  >
                    <Icon className="icon w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    {item.count !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}

        {/* Resource Summary */}
        <div className="glassmorphic-panel rounded-xl p-4 animate-slide-in" style={{ animationDelay: '0.8s' }}>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Resource Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total Resources</span>
              <span className="text-gray-200 font-medium">
                {Object.values(resourceCounts).reduce((sum, count) => sum + (count || 0), 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Active Pods</span>
              <span className="text-green-400 font-medium">{resourceCounts.pods || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Services</span>
              <span className="text-blue-400 font-medium">{resourceCounts.services || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 animate-slide-in" style={{ animationDelay: '1.0s' }}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</h4>
          <button className="w-full modern-btn modern-btn-primary modern-btn-sm">
            <Zap className="w-3 h-3" />
            Create Resource
          </button>
          <button className="w-full modern-btn modern-btn-secondary modern-btn-sm">
            <Activity className="w-3 h-3" />
            View Metrics
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ModernSidebar; 