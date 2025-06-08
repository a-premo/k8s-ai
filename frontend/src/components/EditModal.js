import React, { useState, useEffect } from 'react';
import { X, Brain, Save } from 'lucide-react';
import { useEditResource, useGetResourceYaml } from '../hooks/useK8sResource';

const EditModal = React.memo(({ resource, onClose, onSave }) => {
  const [yaml, setYaml] = useState('');
  const [isModified, setIsModified] = useState(false);
  
  const { data: resourceYaml, isLoading: loadingYaml } = useGetResourceYaml(
    resource?.type,
    resource?.namespace,
    resource?.name
  );
  
  const editMutation = useEditResource();

  useEffect(() => {
    if (resourceYaml && !isModified) {
      setYaml(resourceYaml);
    }
  }, [resourceYaml, isModified]);

  if (!resource) return null;

  const handleYamlChange = (e) => {
    setYaml(e.target.value);
    setIsModified(true);
  };

  const handleSave = async () => {
    try {
      await editMutation.mutateAsync({
        resourceType: resource.type,
        namespace: resource.namespace,
        name: resource.name,
        yaml: yaml
      });
      setIsModified(false);
      onSave?.();
    } catch (error) {
      console.error('Failed to save resource:', error);
    }
  };

  const handleAIAssistance = () => {
    // Placeholder for AI assistance functionality
    console.log('AI assistance requested for:', resource);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (isModified) {
        if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg w-4/5 h-4/5 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              Edit {resource.type}: {resource.name}
            </h2>
            <p className="text-sm text-gray-600">Namespace: {resource.namespace}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSave}
              disabled={!isModified || editMutation.isPending}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {editMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 flex flex-col">
          {loadingYaml ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading resource YAML...</p>
              </div>
            </div>
          ) : (
            <textarea
              value={yaml}
              onChange={handleYamlChange}
              className="flex-1 w-full font-mono text-sm border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="YAML content will appear here..."
              spellCheck={false}
            />
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <button 
              onClick={handleAIAssistance}
              className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            >
              <Brain className="w-4 h-4" />
              AI Assistance
            </button>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {isModified && (
                <span className="text-orange-600 font-medium">• Modified</span>
              )}
              {editMutation.isError && (
                <span className="text-red-600">Error saving changes</span>
              )}
              {editMutation.isSuccess && (
                <span className="text-green-600">Changes saved successfully</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

EditModal.displayName = 'EditModal';

export default EditModal; 