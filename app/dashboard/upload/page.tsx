"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadExcel from "@/components/UploadExcel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Upload Excel Data</h1>
        
        <Tabs defaultValue="merchants" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="merchants">Merchant Data</TabsTrigger>
            <TabsTrigger value="residuals">Residual Payouts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Merchant Transactions
                </CardTitle>
                <CardDescription>
                  Upload merchant transaction data Excel files for processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadExcel datasetType="merchants" />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="residuals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Residual Payouts
                </CardTitle>
                <CardDescription>
                  Upload residual payout data Excel files for processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadExcel datasetType="residuals" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
