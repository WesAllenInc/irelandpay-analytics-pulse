import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from 'lucide-react';
import { 
  ValidationReportsList,
  TriggerValidation 
} from '@/components/data-validation';

export const metadata: Metadata = {
  title: 'Data Validation | Ireland Pay Analytics',
  description: 'Validate data integrity between API and database records',
};

export default function DataValidationPage() {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Data Validation</h1>
      
      <Alert className="bg-blue-50 dark:bg-blue-950">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Data Integrity Check</AlertTitle>
        <AlertDescription>
          Compare API data with database records to identify discrepancies.
          Use these tools to ensure data consistency and reliability across your analytics.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="run">Run Validation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="space-y-4">
          <ValidationReportsList limit={20} />
        </TabsContent>
        
        <TabsContent value="run" className="space-y-4">
          <TriggerValidation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
