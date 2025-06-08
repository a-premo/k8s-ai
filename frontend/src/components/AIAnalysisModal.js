import React from 'react';
import { X, Brain, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

const AIAnalysisModal = ({ isOpen, onClose, analysis, isLoading, error, resourceName, resourceType }) => {
  if (!isOpen) return null;

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                AI Analysis: {resourceName}
              </h2>
              <p className="text-sm text-gray-600">
                {resourceType} Resource Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">AI is analyzing your {resourceType}...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-medium text-red-800">Analysis Failed</h3>
                </div>
                <p className="text-red-700 text-sm">
                  {error.message || 'Failed to analyze the resource. Please try again.'}
                </p>
                {error.message?.includes('not configured') && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-800 text-sm font-medium mb-1">💡 Configuration Required</p>
                    <p className="text-blue-700 text-xs">
                      To enable real AI analysis, configure your AI provider (OpenAI or Anthropic) in the environment variables.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {analysis && !isLoading && !error && (
            <div className="p-6 space-y-6">
              {/* Summary Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-800">Analysis Summary</h3>
                  {analysis.severity && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getSeverityColor(analysis.severity)}`}>
                      {getSeverityIcon(analysis.severity)}
                      <span className="text-sm font-medium">{analysis.severity} Priority</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                </div>
              </div>

              {/* Root Cause */}
              {analysis.rootCause && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium text-gray-800">Root Cause</h4>
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                    <p className="text-orange-800">{analysis.rootCause}</p>
                  </div>
                </div>
              )}

              {/* Insights */}
              {analysis.insights && analysis.insights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium text-gray-800">Key Insights</h4>
                  <div className="space-y-2">
                    {analysis.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-blue-800 text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium text-gray-800">Recommendations</h4>
                  <div className="space-y-3">
                    {analysis.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <p className="text-green-800 text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence and Metadata */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  {analysis.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Confidence Level:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                            style={{ width: `${analysis.confidence}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-gray-800">{analysis.confidence}%</span>
                      </div>
                    </div>
                  )}
                  
                  {analysis.timestamp && (
                    <div className="text-gray-500">
                      Analyzed: {formatTimestamp(analysis.timestamp)}
                    </div>
                  )}
                </div>
                
                {analysis.type && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block">
                    Analysis Type: {analysis.type}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal; 