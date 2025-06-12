import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Spinner,
  useToast as chakraUseToast,
} from "@chakra-ui/react";
import { CheckIcon } from "@chakra-ui/icons";

interface ExcelUploadStatusProps {
  fileName?: string;
  fileSize?: number;
  status: "idle" | "uploading" | "processing" | "success" | "error";
  uploadProgress: number;
  processingResult?: {
    merchants: number;
    metrics?: number;
    residuals?: number;
  };
  datasetType?: "merchants" | "residuals";
  error?: string;
  onClose?: () => void;
}

export const ChakraExcelUploadStatus: React.FC<ExcelUploadStatusProps> = ({
  fileName,
  fileSize = 0,
  status,
  uploadProgress,
  processingResult,
  datasetType = "merchants",
  error,
  onClose,
}) => {
  const toast = chakraUseToast();
  const [showCard, setShowCard] = useState(true);

  useEffect(() => {
    if (status === "success") {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded and processed ${fileName}`,
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top-right"
      });
    } else if (status === "error") {
      toast({
        title: "Upload Failed",
        description: error || "An unknown error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right"
      });
    }
  }, [status, fileName, error, toast]);

  const handleClose = () => {
    setShowCard(false);
    if (onClose) onClose();
  };

  if (!showCard) {
    return null;
  }

  // Format file size to KB, MB, etc.
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Box borderWidth="1px" borderRadius="xl" boxShadow="md" maxW="md" mx="auto">
      <Box p={4} pb={2}>
        <Heading size="md" display="flex" alignItems="center" gap={2}>
          Excel Upload Status
        </Heading>
      </Box>
      
      <Box p={4} pt={2} pb={4}>
        {fileName && (
          <Flex justify="space-between" fontSize="sm" mb={4}>
            <Text fontWeight="medium" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxW="70%">{fileName}</Text>
            <Text color="gray.500">{formatFileSize(fileSize)}</Text>
          </Flex>
        )}
        
        {status === "uploading" && (
          <Box>
            <Box
              height="8px"
              width="100%"
              bg="gray.100"
              borderRadius="full"
              mb={1}
            >
              <Box
                height="100%"
                width={`${uploadProgress}%`}
                bg="blue.500"
                borderRadius="full"
              />
            </Box>
            <Flex justify="space-between" fontSize="xs" color="gray.500">
              <Text>Uploading...</Text>
              <Text>{Math.round(uploadProgress)}%</Text>
            </Flex>
          </Box>
        )}

        {status === "processing" && (
          <Box borderRadius="md" bg="blue.50" p={3}>
            <Flex alignItems="center">
              <Spinner size="sm" mr={3} color="blue.500" />
              <Box>
                <Text fontWeight="bold">Processing Excel Data</Text>
                <Text fontSize="sm">
                  Your file is being processed. This may take a moment...
                </Text>
              </Box>
            </Flex>
          </Box>
        )}

        {status === "success" && processingResult && (
          <Box borderRadius="md" bg="green.50" p={3}>
            <Flex alignItems="flex-start">
              <Box color="green.500" mt={1} mr={3}>
                <CheckIcon />
              </Box>
              <Box>
                <Text fontWeight="bold">Upload Successful</Text>
                <Text mb={2}>Successfully processed:</Text>
                <Box pl={2} mt={1}>
                  <Flex mb={1} alignItems="center">
                    <CheckIcon color="green.500" mr={2} boxSize="3" />
                    <Text>{processingResult.merchants} merchants</Text>
                  </Flex>
                  {datasetType === "residuals" ? (
                    <Flex alignItems="center">
                      <CheckIcon color="green.500" mr={2} boxSize="3" />
                      <Text>{processingResult.residuals} residual records</Text>
                    </Flex>
                  ) : (
                    <Flex alignItems="center">
                      <CheckIcon color="green.500" mr={2} boxSize="3" />
                      <Text>{processingResult.metrics} transaction metrics</Text>
                    </Flex>
                  )}
                </Box>
              </Box>
            </Flex>
          </Box>
        )}

        {status === "error" && (
          <Box borderRadius="md" bg="red.50" p={3}>
            <Flex alignItems="flex-start">
              <Box color="red.500" mt={1} mr={3}>
                <CheckIcon />
              </Box>
              <Box>
                <Text fontWeight="bold">Upload Failed</Text>
                <Text>
                  {error || "An unknown error occurred while processing your file."}
                </Text>
              </Box>
            </Flex>
          </Box>
        )}
      </Box>
      
      <Box p={4} pt={0} display="flex" justifyContent="flex-end">
        <Button 
          onClick={handleClose}
          colorScheme={status === "error" ? "red" : "gray"}
          size="sm"
          variant={status === "error" ? "solid" : "ghost"}
        >
          {status === "error" ? "Dismiss" : "Close"}
        </Button>
      </Box>
    </Box>
  );
};
