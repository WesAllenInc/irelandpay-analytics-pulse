"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadExcel from "@/components/UploadExcel";

const UploadPage = () => {
  const [activeTab, setActiveTab] = useState<string>("merchant-data");

  return (
    <div className="p-6 grid gap-6">
      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Upload Data</CardTitle>
          <CardDescription className="text-foreground-muted">
            Upload Excel files to import merchant or residual data into the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="merchant-data" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="merchant-data">Merchant Data</TabsTrigger>
              <TabsTrigger value="residual-data">Residual Data</TabsTrigger>
            </TabsList>
            <TabsContent value="merchant-data">
              <div className="py-4">
                <UploadExcel datasetType="merchants" />
              </div>
            </TabsContent>
            <TabsContent value="residual-data">
              <div className="py-4">
                <UploadExcel datasetType="residuals" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-foreground-muted">
            <div>
              <h3 className="text-base font-medium text-foreground mb-2">Merchant Data Format</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>File must be in .xlsx or .xls format</li>
                <li>Required columns: MID, Name, Address, City, State, ZIP</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base font-medium text-foreground mb-2">Residual Data Format</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>File must be in .xlsx or .xls format</li>
                <li>Required columns: MID, Date, Amount, Category</li>
                <li>Dates should be in MM/DD/YYYY format</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPage;
