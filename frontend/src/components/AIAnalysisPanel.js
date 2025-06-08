import React from 'react';
import { X, Brain, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const AIAnalysisPanel = React.memo(({ analysis, onClose, className = '' }) => {
  if (!analysis) return null;

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'low':
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'from-red-50 to-red-100 border-red-200';
      case 'medium':
      case 'warning':
        return 'from-yellow-50 to-yellow-100 border-yellow-200';
      case 'low':
      case 'info':
        return 'from-blue-50 to-blue-100 border-blue-200';
      default:
        return 'from-purple-50 to-blue-50 border-purple-200';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const backgroundClass = analysis.severity 
    ? getSeverityColor(analysis.severity)
    : 'from-purple-50 to-blue-50 border-purple-200';

  return (
    <div className={`bg-gradient-to-r ${backgroundClass} border rounded-lg p-6 mb-6 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{analysis.type || 'AI Analysis'}</h3>
              {analysis.severity && getSeverityIcon(analysis.severity)}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              {analysis.confidence && (
                <span className={`font-medium ${getConfidenceColor(analysis.confidence)}`}>
                  Confidence: {analysis.confidence}%
                </span>
              )}
              {analysis.severity && (
                <span className={`font-medium ${
                  analysis.severity.toLowerCase() === 'high' ? 'text-red-600' :
                  analysis.severity.toLowerCase() === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  Severity: {analysis.severity}
                </span>
              )}
              {analysis.timestamp && (
                <span className="text-gray-500">
                  {new Date(analysis.timestamp).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {analysis.summary && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
            <p className="text-gray-700 bg-white/50 p-3 rounded-lg">{analysis.summary}</p>
          </div>
        )}
        
        {analysis.rootCause && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Root Cause
            </h4>
            <p className="text-gray-700 bg-white/50 p-3 rounded-lg">{analysis.rootCause}</p>
          </div>
        )}
        
        {analysis.insights && analysis.insights.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              Insights
            </h4>
            <div className="bg-white/50 p-3 rounded-lg">
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {analysis.insights.map((insight, idx) => (
                  <li key={idx}>{insight}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Recommendations
            </h4>
            <div className="bg-white/50 p-3 rounded-lg">
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {analysis.details && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Additional Details</h4>
            <div className="bg-white/50 p-3 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {typeof analysis.details === 'string' 
                  ? analysis.details 
                  : JSON.stringify(analysis.details, null, 2)
                }
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AIAnalysisPanel.displayName = 'AIAnalysisPanel';

export default AIAnalysisPanel; 