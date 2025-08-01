import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { IrelandPayCRMConfig } from '@/types/sync';

export class IrelandPayCRMClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: IrelandPayCRMConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://crm.ireland-pay.com/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[IrelandPayCRM] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[IrelandPayCRM] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[IrelandPayCRM] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[IrelandPayCRM] Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // Merchant API methods
  async getMerchants(params?: {
    page?: number;
    per_page?: number;
    modified_since?: string;
    search?: string;
  }): Promise<AxiosResponse<any>> {
    return this.client.get('/merchants', { params });
  }

  async getMerchant(merchantId: string): Promise<AxiosResponse<any>> {
    return this.client.get(`/merchants/${merchantId}`);
  }

  async getMerchantTransactions(merchantId: string, params?: {
    year?: number;
    month?: number;
    page?: number;
    per_page?: number;
  }): Promise<AxiosResponse<any>> {
    return this.client.get(`/merchants/${merchantId}/transactions`, { params });
  }

  // Residuals API methods
  async getResiduals(params?: {
    year?: number;
    month?: number;
    page?: number;
    per_page?: number;
  }): Promise<AxiosResponse<any>> {
    return this.client.get('/residuals', { params });
  }

  async getMerchantResiduals(merchantId: string, params?: {
    year?: number;
    month?: number;
  }): Promise<AxiosResponse<any>> {
    return this.client.get(`/merchants/${merchantId}/residuals`, { params });
  }

  // Volumes API methods
  async getVolumes(params?: {
    year?: number;
    month?: number;
    page?: number;
    per_page?: number;
  }): Promise<AxiosResponse<any>> {
    return this.client.get('/volumes', { params });
  }

  async getMerchantVolumes(merchantId: string, params?: {
    year?: number;
    month?: number;
  }): Promise<AxiosResponse<any>> {
    return this.client.get(`/merchants/${merchantId}/volumes`, { params });
  }

  // Health check
  async healthCheck(): Promise<AxiosResponse<any>> {
    return this.client.get('/health');
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.healthCheck();
      return {
        success: true,
        message: `Connection successful. API version: ${response.data?.version || 'unknown'}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Connection failed'
      };
    }
  }

  // Get API limits/quotas
  async getApiLimits(): Promise<AxiosResponse<any>> {
    return this.client.get('/limits');
  }
}

// Factory function to create client from environment variables
export function createIrelandPayCRMClient(): IrelandPayCRMClient {
  const apiKey = process.env.IRELANDPAY_CRM_API_KEY;
  if (!apiKey) {
    throw new Error('IRELANDPAY_CRM_API_KEY environment variable is required');
  }

  return new IrelandPayCRMClient({
    apiKey,
    baseUrl: process.env.IRELANDPAY_CRM_BASE_URL,
    timeout: parseInt(process.env.IRELANDPAY_TIMEOUT_SECONDS || '30') * 1000,
    maxRetries: parseInt(process.env.IRELANDPAY_MAX_RETRIES || '3'),
    backoffBaseMs: parseInt(process.env.IRELANDPAY_BACKOFF_BASE_MS || '1000'),
  });
} 