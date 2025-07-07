'use client';

import { useState } from 'react';
import { CSRFProvider } from '@/components/CSRFProvider';
import CsrfTestForm from '@/components/CsrfTestForm';
import { csrfFetch } from '@/lib/csrf-fetch';

export default function CsrfTestPage() {
  const [ajaxResult, setAjaxResult] = useState<string>('');
  const [ajaxError, setAjaxError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Test AJAX request with CSRF protection
  const handleAjaxTest = async () => {
    setIsLoading(true);
    setAjaxResult('');
    setAjaxError('');

    try {
      // Using our csrfFetch utility to automatically include the token
      const data = await csrfFetch('/api/test/csrf-ajax', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          testData: 'Testing CSRF protection with AJAX',
          timestamp: new Date().toISOString() 
        }),
      });

      setAjaxResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setAjaxError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CSRFProvider>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">CSRF Protection Testing</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Test Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Form Submission Test</h2>
            <CsrfTestForm />
          </div>
          
          {/* AJAX Test Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">AJAX Request Test</h2>
            
            <button
              onClick={handleAjaxTest}
              disabled={isLoading}
              className={`mb-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Sending Request...' : 'Test AJAX with CSRF'}
            </button>
            
            {ajaxResult && (
              <div className="mb-4 p-3 bg-gray-100 rounded overflow-auto max-h-60">
                <h3 className="font-medium text-green-700 mb-2">Response:</h3>
                <pre className="text-sm">{ajaxResult}</pre>
              </div>
            )}
            
            {ajaxError && (
              <div className="p-3 bg-red-100 text-red-800 rounded overflow-auto max-h-60">
                <h3 className="font-medium mb-2">Error:</h3>
                <pre className="text-sm">{ajaxError}</pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">CSRF Protection Documentation</h2>
          
          <div className="prose max-w-none">
            <h3>How CSRF Protection Works</h3>
            <p>
              This implementation provides double-submit cookie protection against CSRF attacks:
            </p>
            <ul>
              <li>A CSRF token is stored as an HTTP-only, SameSite=Strict cookie</li>
              <li>The same token must be included in the request body or headers</li>
              <li>Tokens are automatically refreshed before expiration</li>
              <li>All state-changing operations (POST, PUT, DELETE, etc.) are protected</li>
            </ul>
            
            <h3>Using CSRF Protection</h3>
            <h4>In Forms:</h4>
            <pre className="bg-gray-100 p-2 rounded">
{`// Client-side React form example
const { csrfToken } = useCSRF();

<form>
  <input type="hidden" name="_csrf" value={csrfToken} />
  {/* other form fields */}
</form>`}
            </pre>
            
            <h4>In AJAX Requests:</h4>
            <pre className="bg-gray-100 p-2 rounded">
{`// Using the csrfFetch utility
import { csrfFetch } from '@/lib/csrf-fetch';

const response = await csrfFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});`}
            </pre>
            
            <h4>In API Routes:</h4>
            <pre className="bg-gray-100 p-2 rounded">
{`// Protecting an API route
import { withCsrfProtection } from '@/lib/api-middleware';

async function handler(req: NextRequest) {
  // Your handler logic
}

export const POST = withCsrfProtection(handler);`}
            </pre>
            
            <h4>In Server Actions:</h4>
            <pre className="bg-gray-100 p-2 rounded">
{`// Using in a Server Action
import { validateServerActionCsrf } from '@/lib/api-middleware';

export async function myServerAction(formData: FormData) {
  // Validate the CSRF token first
  await validateServerActionCsrf(formData);
  
  // Then proceed with the action
  // ...
}`}
            </pre>
          </div>
        </div>
      </div>
    </CSRFProvider>
  );
}
