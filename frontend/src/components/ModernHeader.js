import React, { useState } from 'react';
import { Globe, ChevronDown, Wifi, WifiOff, Loader, Settings, Bell, Search, Bot, MessageCircle } from 'lucide-react';
import { useCluster } from '../contexts/ClusterContext';

const ModernHeader = ({ onSearch, hasNotifications = false, onToggleAI, isAIOpen = false }) => {
  const { currentCluster, clusters, loading, switchCluster, getCurrentClusterInfo } = useCluster();
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentClusterInfo = getCurrentClusterInfo();

  const getConnectionStatusConfig = (status) => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'connected',
          text: 'Connected',
          animated: true
        };
      case 'connecting':
        return {
          icon: Loader,
          color: 'connecting',
          text: 'Connecting',
          animated: true
        };
      default:
        return {
          icon: WifiOff,
          color: 'disconnected',
          text: 'Disconnected',
          animated: false
        };
    }
  };

  const statusConfig = getConnectionStatusConfig(currentClusterInfo?.status);
  const StatusIcon = statusConfig.icon;

  const handleClusterSwitch = async (clusterId) => {
    await switchCluster(clusterId);
    setIsClusterDropdownOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="modern-header sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section - Logo & Cluster Selector */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gradient">K8s AI IDE</h1>
          </div>

          {/* Cluster Selector */}
          <div className="relative">
            <button
              onClick={() => setIsClusterDropdownOpen(!isClusterDropdownOpen)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 cluster-selector animate-slide-in"
            >
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">
                {loading ? 'Switching...' : currentClusterInfo?.displayName}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isClusterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Cluster Dropdown */}
            {isClusterDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 glassmorphic-panel rounded-xl shadow-xl animate-scale-in">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                    Available Clusters
                  </div>
                  {clusters.map((cluster) => (
                    <button
                      key={cluster.id}
                      onClick={() => handleClusterSwitch(cluster.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                        cluster.id === currentCluster
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          cluster.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span>{cluster.name}</span>
                      </div>
                      {cluster.id === currentCluster && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className={`connection-status ${statusConfig.color}`}>
            <div className={`connection-indicator ${statusConfig.animated ? 'animated' : ''}`}>
              <StatusIcon className="w-4 h-4" />
            </div>
            <span>{statusConfig.text}</span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-2xl mx-8">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources, namespaces, or use AI commands..."
                className="w-full bg-white/5 border border-gray-700 rounded-full pl-10 pr-4 py-2 text-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         backdrop-blur-sm transition-all"
              />
            </div>
          </form>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* AI Assistant */}
          <button 
            onClick={onToggleAI}
            className={`relative p-2 transition-colors rounded-lg ${
              isAIOpen 
                ? 'text-blue-400 bg-blue-500/20 glow-blue' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="AI Assistant"
          >
            <Bot className="w-5 h-5" />
            {isAIOpen && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <Bell className="w-5 h-5" />
            {hasNotifications && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Settings */}
          <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <Settings className="w-5 h-5" />
          </button>

          {/* Cluster Environment Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
            currentClusterInfo?.type === 'production' 
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : currentClusterInfo?.type === 'staging'
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
              : 'bg-green-500/10 text-green-400 border-green-500/30'
          }`}>
            {currentClusterInfo?.displayName}
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {isClusterDropdownOpen && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setIsClusterDropdownOpen(false)}
        />
      )}
    </header>
  );
};

export default ModernHeader; 