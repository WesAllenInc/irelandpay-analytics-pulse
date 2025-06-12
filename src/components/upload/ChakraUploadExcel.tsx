import React, { useState, useRef, ChangeEvent } from "react";
import { 
  Box, 
  Button, 
  Heading, 
  Input,
  Text,
  Flex,
  Progress,
} from "@chakra-ui/react";
// Import Toast from Chakra UI
import { useToast } from "@chakra-ui/toast";
// Import Card components
import { Card, CardBody, CardHeader } from "@chakra-ui/card";
// Import Form components
import { FormControl, FormLabel } from "@chakra-ui/form-control";
// Import Alert components
import { Alert, AlertIcon } from "@chakra-ui/alert";
// Import Menu components
import { Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/menu";

import { supabase } from "../../utils/supabaseClient";
// Import the ExcelUploadStatus component
import { ChakraExcelUploadStatus } from "./ChakraExcelUploadStatus";

interface ProcessingResult {
  success: boolean;
  message: string;
  merchants?: number;
  metrics?: number;
  residuals?: number;
  error?: string;
}

type DatasetType = "merchants" | "residuals";

const ChakraUploadExcel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [datasetType, setDatasetType] = useState<DatasetType>("merchants");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (file) {
      toast({
        title: "File Selected",
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingResult(null);
      setUploadStatus("uploading");
      setUploadProgress(0);
      
      // Validate file extension
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        throw new Error("Invalid file format. Please upload an Excel file (.xlsx or .xls)");
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 300);
      
      // Upload file to Supabase Storage
      const bucketName = "uploads";
      const folderPath = datasetType === "merchants" ? "merchant" : "residual";
      const filePath = `${folderPath}/${selectedFile.name}`;
      
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        setUploadStatus("error");
        setErrorMessage(`Upload error: ${error.message}`);
        setIsProcessing(false);
        return;
      }
      
      // File uploaded successfully, now process it with the API endpoint
      setUploadStatus("processing");
      
      // Get the URL for the uploaded file
      const { data: fileUrlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      const fileUrl = fileUrlData.publicUrl;
      
      // Process the file using the API route
      const response = await fetch('/api/process-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          filePath: filePath,
          fileUrl: fileUrl,
          datasetType: datasetType
        }),
      });
      
      const result: ProcessingResult = await response.json();
      
      setProcessingResult(result);
      setUploadStatus(result.success ? "success" : "error");
      
      if (!result.success) {
        setErrorMessage(result.error || "Failed to process file");
      }
      
    } catch (error: any) {
      setUploadStatus("error");
      setErrorMessage(error.message || "An unexpected error occurred");
      console.error("Upload error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusClose = () => {
    if (uploadStatus === "success") {
      resetForm();
    }
    setProcessingResult(null);
  };

  return (
    <Card borderRadius="1rem" boxShadow="0 4px 6px rgba(0,0,0,0.1)" bg="white">
      <CardHeader pb={0}>
        <Heading size="md">Upload Excel Data</Heading>
        <Text color="gray.600" mt={1}>Upload merchant or residual data for analysis</Text>
      </CardHeader>
      
      <CardBody pt={6}>
        <Box mb={4}>
          <FormLabel htmlFor="dataset-type" fontSize="sm" fontWeight="medium">Dataset Type</FormLabel>
          <Menu>
            <MenuButton as={Button} variant="outline" w="100%" justifyContent="space-between">
              {datasetType === "merchants" ? "Merchant Data" : "Residual Data"}
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => setDatasetType("merchants")}>
                Merchant Data
              </MenuItem>
              <MenuItem onClick={() => setDatasetType("residuals")}>
                Residual Data
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
        
        <Box as="form" onSubmit={handleFileUpload} gap={6} display="flex" flexDirection="column">
          <FormControl mb={4}>
            <FormLabel htmlFor="excel-file" fontSize="sm" fontWeight="medium">Excel File</FormLabel>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              paddingY={1.5}
              ref={fileInputRef}
              onChange={onFileChange}
              disabled={isProcessing}
              aria-describedby="file-format-info"
              aria-label="Select Excel file"
              title="Select an Excel file (.xlsx or .xls) to upload"
            />
            <Text id="file-format-info" fontSize="xs" color="gray.500" mt={1}>
              Accepted formats: .xlsx, .xls
            </Text>
          </FormControl>
          
          {selectedFile && (
            <Alert status="info" borderRadius="md" mb={4}>
              <AlertIcon />
              <Flex justifyContent="space-between" w="100%" alignItems="center">
                <Text fontWeight="medium" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxW="70%">{selectedFile.name}</Text>
                <Text fontSize="xs" color="gray.500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </Text>
              </Flex>
            </Alert>
          )}
          
          <Button
            type="submit"
            colorScheme="blue"
            disabled={isProcessing || !selectedFile}
            w={{ base: "100%", sm: "auto" }}
          >
            {isProcessing ? "Processing..." : `Upload ${datasetType === "merchants" ? "Merchant" : "Residual"} Data`}
          </Button>
        </Box>
        
        {uploadStatus !== "idle" && (
          <Box mt={6}>
            <ChakraExcelUploadStatus
              fileName={selectedFile?.name}
              fileSize={selectedFile?.size}
              uploadProgress={uploadProgress}
              status={uploadStatus}
              datasetType={datasetType}
              processingResult={processingResult?.success && processingResult.merchants ? {
                merchants: processingResult.merchants || 0,
                metrics: processingResult.metrics,
                residuals: processingResult.residuals
              } : undefined}
              error={errorMessage}
              onClose={handleStatusClose}
            />
          </Box>
        )}
      </CardBody>
    </Card>
  );
};

export default ChakraUploadExcel;
