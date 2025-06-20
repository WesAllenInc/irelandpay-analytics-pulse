'use client';

import { useState } from 'react';
import { createClientComponentClient } from "@/lib/supabase-compat";
import { Database } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const UploadResiduals = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [statusColor, setStatusColor] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const supabaseClient = createClientComponentClient<Database>();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setStatusMsg('');
      setStatusColor('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setStatusMsg('Please select a file');
      setStatusColor('text-red-600');
      return;
    }

    try {
      setIsLoading(true);
      
      // Upload file to Supabase Storage
      const filePath = `residuals/${selectedFile.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('residuals')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setStatusMsg(`Upload error: ${uploadError.message}`);
        setStatusColor('text-red-600');
        setIsLoading(false);
        return;
      }

      // Process the uploaded Excel file using the API route
      const response = await fetch('/api/process-residual-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });

      const data = await response.json();

      if (data.success) {
        setStatusMsg(`Successfully processed ${data.inserted} rows. Updated ${data.merchants_updated} merchant records.`);
        setStatusColor('text-green-600');
      } else {
        setStatusMsg(`Parse error: ${data.error}`);
        setStatusColor('text-red-600');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setStatusMsg(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      setStatusColor('text-red-600');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Residual Payout Excel</CardTitle>
        <CardDescription>
          Upload Excel files containing merchant residual payout information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isLoading}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Supported formats: .xlsx, .xls
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={!selectedFile || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Upload and Process'
            )}
          </Button>
        </form>

        {statusMsg && (
          <Alert className="mt-4">
            <AlertDescription className={statusColor}>
              {statusMsg}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadResiduals;
