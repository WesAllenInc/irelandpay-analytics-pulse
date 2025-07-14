// NOTE: This file depends on the hooks version of use-toast in '../../../hooks/hooks/use-toast'.
import { useToast as baseUseToast, toast as baseToast } from "../../../hooks/hooks/use-toast";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo, FiUpload } from "react-icons/fi";
import React from "react";

function toastSuccess(message: string, description?: string) {
  return baseToast({
    title: `✔️ ${message}`,
    description,
  });
}

function toastError(message: string, description?: string) {
  return baseToast({
    title: `❌ ${message}`,
    description,
  });
}

function toastWarning(message: string, description?: string) {
  return baseToast({
    title: `⚠️ ${message}`,
    description,
  });
}

function toastInfo(message: string, description?: string) {
  return baseToast({
    title: `ℹ️ ${message}`,
    description,
  });
}

function toastUploadProgress(message: string, progress: number) {
  return baseToast({
    title: `⬆️ ${message}`,
    description: `Progress: ${progress}%`,
  });
}

const toast = Object.assign(baseToast, {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  uploadProgress: toastUploadProgress,
});

export function useToast() {
  return baseUseToast();
}

export { toast };
