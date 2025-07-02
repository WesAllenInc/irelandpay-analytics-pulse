'use client';

import React, { useState, useEffect } from 'react';
import styles from './accessibility-tester.module.css';
import { getContrastRatio, getContrastAssessment } from '@/lib/contrastChecker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorTestResult {
  elementName: string;
  foregroundColor: string;
  backgroundColor: string;
  contrastRatio: number;
  assessment: string;
  passes: {
    aaLargeText: boolean;
    aa: boolean;
    aaaLargeText: boolean;
    aaa: boolean;
  };
}

/**
 * Development component for testing accessibility and color contrast
 * This is NOT intended for production use
 */
export function AccessibilityTester() {
  const [selectedElement, setSelectedElement] = useState<string>('');
  const [results, setResults] = useState<ColorTestResult[]>([]);
  const [testPath, setTestPath] = useState<string>('');
  
  // Test a specific element by selector
  const testElementContrast = () => {
    if (!selectedElement || typeof document === 'undefined') return;
    
    try {
      const element = document.querySelector(selectedElement);
      if (!element) {
        console.warn(`Element not found: ${selectedElement}`);
        return;
      }

      const style = window.getComputedStyle(element);
      const foregroundColor = rgbToHex(style.color);
      const backgroundColor = rgbToHex(style.backgroundColor);
      const ratio = getContrastRatio(foregroundColor, backgroundColor);
      
      const newResult: ColorTestResult = {
        elementName: selectedElement,
        foregroundColor: foregroundColor,
        backgroundColor: backgroundColor,
        contrastRatio: ratio,
        assessment: getContrastAssessment(ratio),
        passes: {
          aaLargeText: ratio >= 3,
          aa: ratio >= 4.5,
          aaaLargeText: ratio >= 4.5,
          aaa: ratio >= 7,
        }
      };
      
      setResults(prev => [newResult, ...prev]);
    } catch (error) {
      console.error('Error testing element contrast:', error);
    }
  };

  // Test all key components on the current page
  const testAllComponents = () => {
    const keySelectors = [
      'button', 
      'a', 
      '.KPICard', 
      'th', 
      'td', 
      'input',
      'label',
      '.text-muted-foreground'
    ];
    
    keySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const style = window.getComputedStyle(element);
          const foregroundColor = rgbToHex(style.color);
          const backgroundColor = rgbToHex(style.backgroundColor);
          
          // Skip elements with transparent backgrounds
          if (backgroundColor === '#000000' || backgroundColor === '#ffffff' && 
              style.backgroundColor === 'rgba(0, 0, 0, 0)') {
            return;
          }
          
          const ratio = getContrastRatio(foregroundColor, backgroundColor);
          
          const newResult: ColorTestResult = {
            elementName: `${selector}[${index}]`,
            foregroundColor: foregroundColor,
            backgroundColor: backgroundColor,
            contrastRatio: ratio,
            assessment: getContrastAssessment(ratio),
            passes: {
              aaLargeText: ratio >= 3,
              aa: ratio >= 4.5,
              aaaLargeText: ratio >= 4.5,
              aaa: ratio >= 7,
            }
          };
          
          setResults(prev => [newResult, ...prev]);
        });
      } catch (error) {
        console.error(`Error testing ${selector} elements:`, error);
      }
    });
  };

  // Navigate to the test path and then run tests
  const navigateAndTest = () => {
    if (!testPath) return;
    
    // We'll use this approach for client-side navigation
    window.history.pushState({}, '', testPath);
    
    // Allow time for components to render before testing
    setTimeout(() => {
      testAllComponents();
    }, 1000);
  };
  
  // Helper function to convert RGB to Hex
  const rgbToHex = (rgb: string) => {
    // Extract RGB values
    const rgbValues = rgb.match(/\d+/g);
    if (!rgbValues || rgbValues.length < 3) return '#FFFFFF';
    
    return '#' + rgbValues.slice(0, 3).map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Accessibility Tester</h1>
        <p className="text-muted-foreground mb-6">
          This tool tests UI elements for WCAG color contrast compliance. Use it during development to identify and fix accessibility issues.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Test Specific Element</h2>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="element-selector">CSS Selector</Label>
              <Input
                id="element-selector"
                placeholder=".my-component"
                value={selectedElement}
                onChange={(e) => setSelectedElement(e.target.value)}
                aria-label="CSS Selector for element to test"
              />
            </div>
            <Button 
              onClick={testElementContrast}
              disabled={!selectedElement}
            >
              Test Element
            </Button>
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Test Page Components</h2>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="test-path">Page Path to Test</Label>
              <Input
                id="test-path"
                placeholder="/dashboard"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                aria-label="Path of the page to test"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={navigateAndTest} disabled={!testPath}>
                Navigate & Test
              </Button>
              <Button 
                variant="outline" 
                onClick={testAllComponents}
              >
                Test Current Page
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Test Results</h2>
      {results.length === 0 ? (
        <p className="text-muted-foreground">No tests run yet. Select an element or test the current page.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-2 text-left">Element</th>
                <th className="px-4 py-2 text-left">Foreground</th>
                <th className="px-4 py-2 text-left">Background</th>
                <th className="px-4 py-2 text-left">Ratio</th>
                <th className="px-4 py-2 text-left">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-card' : 'bg-muted/50'}>
                  <td className="px-4 py-3 font-mono text-sm">{result.elementName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className={styles.foregroundColor}
                        style={{ '--sample-color': result.foregroundColor } as React.CSSProperties}
                        aria-hidden="true"
                      />
                      {result.foregroundColor}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className={styles.backgroundColor}
                        style={{ '--sample-color': result.backgroundColor } as React.CSSProperties}
                        aria-hidden="true"
                      />
                      {result.backgroundColor}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={
                      result.passes.aa 
                        ? 'text-green-500 font-medium' 
                        : 'text-red-500 font-medium'
                    }>
                      {result.contrastRatio.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className={
                        result.passes.aa 
                          ? 'text-green-500 font-medium' 
                          : 'text-red-500 font-medium'
                      }>
                        {result.assessment}
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className={result.passes.aaLargeText ? 'text-green-500' : 'text-red-500'}>
                          AA Large: {result.passes.aaLargeText ? '✓' : '✗'}
                        </span>
                        <span className={result.passes.aa ? 'text-green-500' : 'text-red-500'}>
                          AA Normal: {result.passes.aa ? '✓' : '✗'}
                        </span>
                        <span className={result.passes.aaaLargeText ? 'text-green-500' : 'text-red-500'}>
                          AAA Large: {result.passes.aaaLargeText ? '✓' : '✗'}
                        </span>
                        <span className={result.passes.aaa ? 'text-green-500' : 'text-red-500'}>
                          AAA Normal: {result.passes.aaa ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <Button 
        variant="outline" 
        onClick={() => setResults([])} 
        className="mt-4"
        disabled={results.length === 0}
      >
        Clear Results
      </Button>
    </div>
  );
}
