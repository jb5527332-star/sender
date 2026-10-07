"use client";

import React, { useState } from "react";
import { SpamBypassAnalyzer } from "@/utils/spam-bypass";

interface ContentOptimizerProps {
  subject: string;
  message: string;
  onOptimize: (optimizedSubject: string, optimizedMessage: string) => void;
  className?: string;
}

export default function ContentOptimizer({
  subject,
  message,
  onOptimize,
  className = "",
}: ContentOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<{
    originalScore: number;
    optimizedScore: number;
    improvements: string[];
  } | null>(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);

    try {
      // Analyze current content
      const originalAnalysis = SpamBypassAnalyzer.analyzeContent(
        subject + " " + message
      );

      // Get optimized versions
      const subjectAnalysis = SpamBypassAnalyzer.analyzeContent(subject);
      const messageAnalysis = SpamBypassAnalyzer.analyzeContent(message);

      const optimizedSubject = subjectAnalysis.optimizedContent || subject;
      const optimizedMessage = messageAnalysis.optimizedContent || message;

      // Analyze optimized content
      const optimizedAnalysis = SpamBypassAnalyzer.analyzeContent(
        optimizedSubject + " " + optimizedMessage
      );

      // Track improvements
      const improvements = [];
      if (originalAnalysis.score > optimizedAnalysis.score) {
        improvements.push(
          `Reduced spam score from ${originalAnalysis.score} to ${optimizedAnalysis.score}`
        );
      }
      if (originalAnalysis.suggestions.length > 0) {
        improvements.push(
          `Applied ${originalAnalysis.suggestions.length} optimization suggestions`
        );
      }
      if (optimizedAnalysis.score < 20) {
        improvements.push("Content now passes spam filters");
      }

      setLastOptimization({
        originalScore: originalAnalysis.score,
        optimizedScore: optimizedAnalysis.score,
        improvements,
      });

      // Apply optimizations
      onOptimize(optimizedSubject, optimizedMessage);
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 20) return "text-green-600";
    if (score < 40) return "text-yellow-600";
    return "text-red-600";
  };

  const currentAnalysis = SpamBypassAnalyzer.analyzeContent(
    subject + " " + message
  );
  const hasContent = subject.trim() || message.trim();
  const needsOptimization = currentAnalysis.score > 20;

  if (!hasContent) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">Content Optimizer</h3>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentAnalysis.score < 20
                ? "bg-green-100 text-green-700"
                : currentAnalysis.score < 40
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            Score: {currentAnalysis.score}
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={isOptimizing || !needsOptimization}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            needsOptimization && !isOptimizing
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isOptimizing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Optimizing...</span>
            </div>
          ) : needsOptimization ? (
            "✨ Optimize Content"
          ) : (
            "✅ Content Optimized"
          )}
        </button>
      </div>

      {/* Current Status */}
      <div className="mb-3">
        {needsOptimization ? (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-gray-700">
              Content could be improved for better deliverability
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-green-600">✅</span>
            <span className="text-gray-700">
              Content looks good for email delivery
            </span>
          </div>
        )}
      </div>

      {/* Optimization Results */}
      {lastOptimization && (
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-green-600">🎉</span>
            <span className="font-medium text-green-800">
              Optimization Complete!
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Spam Score:</span>
              <div className="flex items-center space-x-2">
                <span className={getScoreColor(lastOptimization.originalScore)}>
                  {lastOptimization.originalScore}
                </span>
                <span className="text-gray-400">→</span>
                <span
                  className={getScoreColor(lastOptimization.optimizedScore)}
                >
                  {lastOptimization.optimizedScore}
                </span>
              </div>
            </div>

            {lastOptimization.improvements.length > 0 && (
              <div>
                <span className="text-gray-600 block mb-1">Improvements:</span>
                <ul className="space-y-1">
                  {lastOptimization.improvements.map((improvement, index) => (
                    <li
                      key={index}
                      className="flex items-center space-x-2 text-green-700"
                    >
                      <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Tips */}
      {currentAnalysis.suggestions.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">
            💡 Quick Tips:
          </div>
          <ul className="space-y-1 text-sm text-blue-700">
            {currentAnalysis.suggestions
              .slice(0, 3)
              .map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{suggestion.reason}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
