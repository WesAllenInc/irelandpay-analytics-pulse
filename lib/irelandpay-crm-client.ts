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
        'X-API-KEY': this.apiKey,
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
    start_date?: string;
    end_date?: string;
    page?: number;
    per_page?: number;
  }): Promise<AxiosResponse<any>> {
    return this.client.get(`/merchants/${merchantId}/transactions`, { params });
  }

  // Residuals API methods - using correct endpoints from API documentation
  async getResidualsSummary(year: number, month: number): Promise<AxiosResponse<any>> {
    return this.client.get(`/residuals/reports/summary/${year}/${month}`);
  }

  async getResidualsSummaryWithRows(processorId: string, year: number, month: number): Promise<AxiosResponse<any>> {
    return this.client.get(`/residuals/reports/summary/rows/${processorId}/${year}/${month}`);
  }

  async getResidualsDetails(processorId: string, year: number, month: number): Promise<AxiosResponse<any>> {
    return this.client.get(`/residuals/reports/details/${processorId}/${year}/${month}`);
  }

  async getResidualsLineItems(year: number, month: number): Promise<AxiosResponse<any>> {
    return this.client.get(`/residuals/lineitems/${year}/${month}`);
  }

  async getResidualsTemplates(): Promise<AxiosResponse<any>> {
    return this.client.get('/residuals/templates');
  }

  async getAssignedResidualsTemplates(year: number, month: number): Promise<AxiosResponse<any>> {
    return this.client.get(`/residuals/templates/assigned/${year}/${month}`);
  }

  // Leads API methods
  async getLeads(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<AxiosResponse<any>> {
    return this.client.get('/leads', { params });
  }

  async getLead(leadId: string): Promise<AxiosResponse<any>> {
    return this.client.get(`/leads/${leadId}`);
  }

  // Test connection using a known endpoint
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.getMerchants({ per_page: 1 });
      return {
        success: true,
        message: `Connection successful. API is accessible.`
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Connection test failed'
      };
    }
  }

  // Get API rate limit information
  async getApiLimits(): Promise<AxiosResponse<any>> {
    // This would be available in response headers, not a separate endpoint
    const response = await this.getMerchants({ per_page: 1 });
    return response;
  }
}

export function createIrelandPayCRMClient(): IrelandPayCRMClient {
  return new IrelandPayCRMClient({
    apiKey: process.env.IRELANDPAY_CRM_API_KEY || '',
    baseUrl: process.env.IRELANDPAY_CRM_BASE_URL,
    timeout: 30000,
  });
} 