import React, { useState, useEffect, useCallback } from 'react';
import { X, Brain, Save, Sparkles, RotateCcw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useEditResource, useK8sResourceDetail, useAIEditResource } from '../hooks/useK8sResource';

const EditModal = React.memo(({ 
  resource = {}, 
  resourceType = '', 
  namespace = '',
  isOpen,
  onClose,
  onSave 
}) => {
  const [yaml, setYaml] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [showAiAssist, setShowAiAssist] = useState(false);
  
  // Use the props with fallbacks
  const effectiveResourceType = resourceType || resource?.type || '';
  const effectiveNamespace = namespace || resource?.namespace || '';
  const effectiveName = resource?.name || '';
  
  const { data: resourceData, isLoading: loadingYaml, error: loadError } = useK8sResourceDetail(
    effectiveResourceType,
    effectiveNamespace,
    effectiveName
  );
  
  const editMutation = useEditResource();
  const aiEditMutation = useAIEditResource();

  useEffect(() => {
    if (resourceData?.yaml && !isModified) {
      setYaml(resourceData.yaml);
    }
  }, [resourceData, isModified]);

  const handleYamlChange = useCallback((value) => {
    setYaml(value || '');
    setIsModified(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!effectiveResourceType || !effectiveName) {
      console.error('Missing resource type or name');
      return;
    }
    
    try {
      await editMutation.mutateAsync({
        resourceType: effectiveResourceType,
        namespace: effectiveNamespace,
        name: effectiveName,
        yaml: yaml
      });
      setIsModified(false);
      onSave?.();
    } catch (error) {
      console.error('Failed to save resource:', error);
    }
  }, [effectiveResourceType, effectiveNamespace, effectiveName, yaml, editMutation, onSave]);

  const handleAiAssist = useCallback(async () => {
    if (!aiInstructions.trim() || !effectiveResourceType) return;
    
    try {
      const response = await aiEditMutation.mutateAsync({
        resourceType: effectiveResourceType,
        currentYaml: yaml,
        instructions: aiInstructions
      });
      
      if (response.modified_yaml) {
        setYaml(response.modified_yaml);
        setIsModified(true);
      }
      setAiInstructions('');
    } catch (error) {
      console.error('AI assist failed:', error);
    }
  }, [aiInstructions, effectiveResourceType, yaml, aiEditMutation]);

  const handleReset = useCallback(() => {
    if (resourceData?.yaml) {
      setYaml(resourceData.yaml);
      setIsModified(false);
      setShowAiAssist(false);
      setAiInstructions('');
    }
  }, [resourceData]);

  const handleClose = useCallback(() => {
    if (isModified) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose?.();
      }
    } else {
      onClose?.();
    }
  }, [isModified, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (isModified && !editMutation.isPending) {
              handleSave();
            }
            break;
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              handleReset();
            }
            break;
        }
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isModified, editMutation.isPending, handleSave, handleReset, handleClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Don't render if not open or no resource
  if (!isOpen || !resource || !effectiveName) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg w-5/6 h-5/6 flex flex-col shadow-2xl max-w-6xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              Edit {effectiveResourceType ? effectiveResourceType.charAt(0).toUpperCase() + effectiveResourceType.slice(1) : 'Resource'}: {effectiveName}
            </h2>
            <p className="text-sm text-gray-600">Namespace: {effectiveNamespace || 'default'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAiAssist(!showAiAssist)}
              className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-100 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Assist
            </button>
            <button 
              onClick={handleReset}
              disabled={!isModified}
              className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button 
              onClick={handleSave}
              disabled={!isModified || editMutation.isPending}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {editMutation.isPending ? 'Saving...' : 'Apply'}
            </button>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Assist Panel */}
        {showAiAssist && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., 'add resource limits of 1 CPU and 2Gi memory' or 'increase replicas to 3'"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAiAssist()}
              />
              <button
                onClick={handleAiAssist}
                disabled={!aiInstructions.trim() || aiEditMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {aiEditMutation.isPending ? 'Processing...' : 'Apply AI'}
              </button>
            </div>
            {aiEditMutation.isError && (
              <p className="text-red-600 text-sm mt-2">
                AI assist failed: {aiEditMutation.error?.message || 'Unknown error'}
              </p>
            )}
          </div>
        )}
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {loadingYaml ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading resource YAML...</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="flex-1 flex items-center justify-center text-red-600">
              <div className="text-center">
                <X className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Failed to load YAML</p>
                <p className="text-sm mt-2">{loadError?.message || 'Unknown error'}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language="yaml"
                theme="vs-dark"
                value={yaml}
                onChange={handleYamlChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                }}
              />
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 text-sm">
              {isModified && (
                <span className="text-orange-600 font-medium flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  Modified
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              {editMutation.isError && (
                <div className="max-w-md">
                  <div className="text-red-600 font-medium mb-1">
                    {editMutation.error?.message || 'Failed to save changes'}
                  </div>
                  {editMutation.error?.suggestion && (
                    <div className="text-blue-600 text-xs bg-blue-50 p-2 rounded border">
                      💡 {editMutation.error.suggestion}
                    </div>
                  )}
                  {editMutation.error?.details && editMutation.error?.details !== editMutation.error?.message && (
                    <details className="text-xs text-gray-600 mt-1">
                      <summary className="cursor-pointer hover:text-gray-800">Technical details</summary>
                      <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                        {editMutation.error.details}
                      </div>
                    </details>
                  )}
                </div>
              )}
              {editMutation.isSuccess && (
                <span className="text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Changes saved successfully
                </span>
              )}
              <span className="text-gray-500">
                Press Ctrl+S to save • Esc to close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

EditModal.displayName = 'EditModal';

export default EditModal; 