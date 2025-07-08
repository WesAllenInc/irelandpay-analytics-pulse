import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Input validation types
interface ValidationRequest {
  dataType: string;
  syncScope?: string | null;
  sampleSize?: number;
  validateAll?: boolean;
}

// Validation utility types
interface ValidationContext {
  reportId: string;
  dataType: string;
  syncScope?: string | null;
  supabase: SupabaseClient;
  apiBaseUrl: string;
  apiKey: string;
  totalRecords: number;
  recordsWithIssues: number;
  startTime: number;
}

// Define field mappings for each data type
const fieldMappings: Record<string, Record<string, string>> = {
  merchants: {
    id: "merchant_id",
    name: "merchant_name",
    status: "status",
    mid: "mid",
    address: "address",
    city: "city",
    state: "state",
    zip: "zip_code",
    phone: "phone",
    email: "email",
    // Add more field mappings as needed
  },
  residuals: {
    id: "residual_id",
    merchant_id: "merchant_id",
    month: "month",
    year: "year",
    volume: "processing_volume",
    transaction_count: "transaction_count",
    revenue: "revenue",
    agent_commission: "agent_commission",
    // Add more field mappings as needed
  },
  agents: {
    id: "agent_id",
    name: "agent_name",
    email: "email",
    phone: "phone",
    status: "status",
    commission_rate: "commission_rate",
    // Add more field mappings as needed
  }
};

// Main serve function
serve(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // API credentials
    const apiBaseUrl = Deno.env.get('IRIS_CRM_API_URL') ?? '';
    const apiKey = Deno.env.get('IRIS_CRM_API_KEY') ?? '';
    
    if (!apiBaseUrl || !apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "API credentials not configured" 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const { dataType, syncScope, sampleSize = 100, validateAll = false } = await req.json() as ValidationRequest;
    
    // Validate input
    if (!dataType || !['merchants', 'residuals', 'agents'].includes(dataType)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid data type. Must be one of: merchants, residuals, agents" 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a new validation report
    const { data: reportData, error: reportError } = await supabase
      .rpc('create_validation_report', {
        p_report_type: dataType,
        p_report_scope: syncScope || null
      });
      
    if (reportError) {
      throw new Error(`Error creating validation report: ${reportError.message}`);
    }
    
    const reportId = reportData;
    
    // Update report status to running
    await supabase.rpc('update_validation_report_status', {
      p_report_id: reportId,
      p_status: 'running'
    });
    
    // Initialize validation context
    const validationContext: ValidationContext = {
      reportId,
      dataType,
      syncScope,
      supabase,
      apiBaseUrl,
      apiKey,
      totalRecords: 0,
      recordsWithIssues: 0,
      startTime: performance.now()
    };
    
    try {
      // Run the validation based on data type
      switch (dataType) {
        case 'merchants':
          await validateMerchants(validationContext, sampleSize, validateAll);
          break;
        case 'residuals':
          await validateResiduals(validationContext, syncScope, sampleSize, validateAll);
          break;
        case 'agents':
          await validateAgents(validationContext, sampleSize, validateAll);
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }
      
      // Calculate execution time
      const executionTimeMs = Math.round(performance.now() - validationContext.startTime);
      
      // Update report status to completed
      await supabase.rpc('update_validation_report_status', {
        p_report_id: reportId,
        p_status: 'completed',
        p_total_records: validationContext.totalRecords,
        p_records_with_issues: validationContext.recordsWithIssues,
        p_execution_time_ms: executionTimeMs
      });
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          reportId,
          dataType,
          syncScope,
          totalRecords: validationContext.totalRecords,
          recordsWithIssues: validationContext.recordsWithIssues,
          executionTimeMs
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      // Update report status to failed
      await supabase.rpc('update_validation_report_status', {
        p_report_id: reportId,
        p_status: 'failed',
        p_execution_time_ms: Math.round(performance.now() - validationContext.startTime)
      });
      
      throw error;
    }
  } catch (error) {
    console.error("Error in validate-data:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "An unexpected error occurred" 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Validation function for merchants
async function validateMerchants(
  context: ValidationContext, 
  sampleSize: number,
  validateAll: boolean
): Promise<void> {
  // Get merchant records from the database
  const { data: dbMerchants, error } = await context.supabase
    .from('merchants')
    .select('*')
    .limit(validateAll ? 1000000 : sampleSize); // Use high limit for "all" records
  
  if (error) {
    throw new Error(`Error fetching merchants from database: ${error.message}`);
  }
  
  context.totalRecords = dbMerchants.length;
  
  // Process each merchant
  for (const dbMerchant of dbMerchants) {
    try {
      // Fetch merchant from API
      const apiMerchant = await fetchMerchantFromApi(context, dbMerchant.merchant_id);
      
      // Compare records
      const issues = compareRecords(
        'merchant', 
        dbMerchant.merchant_id, 
        apiMerchant, 
        dbMerchant, 
        fieldMappings.merchants
      );
      
      // Record any issues found
      if (issues.length > 0) {
        context.recordsWithIssues++;
        
        for (const issue of issues) {
          await context.supabase.rpc('add_validation_issue', {
            p_report_id: context.reportId,
            p_record_id: dbMerchant.merchant_id,
            p_record_type: 'merchant',
            p_issue_type: issue.issueType,
            p_issue_severity: issue.severity,
            p_api_value: issue.apiValue,
            p_db_value: issue.dbValue,
            p_field_path: issue.fieldPath,
            p_description: issue.description
          });
        }
      }
    } catch (err) {
      // Record error as an issue
      context.recordsWithIssues++;
      
      await context.supabase.rpc('add_validation_issue', {
        p_report_id: context.reportId,
        p_record_id: dbMerchant.merchant_id,
        p_record_type: 'merchant',
        p_issue_type: 'api_error',
        p_issue_severity: 'high',
        p_api_value: null,
        p_db_value: { merchant_id: dbMerchant.merchant_id },
        p_field_path: null,
        p_description: `Error validating merchant: ${err.message}`
      });
    }
  }
}

// Validation function for residuals
async function validateResiduals(
  context: ValidationContext, 
  syncScope: string | null | undefined,
  sampleSize: number,
  validateAll: boolean
): Promise<void> {
  // Build query based on scope
  let query = context.supabase
    .from('residuals')
    .select('*')
    .limit(validateAll ? 1000000 : sampleSize);
  
  // Apply scope filter if provided
  if (syncScope) {
    // Assume syncScope is in format 'YYYY-MM'
    const [year, month] = syncScope.split('-');
    query = query.eq('year', year).eq('month', month);
  }
  
  // Get residuals from the database
  const { data: dbResiduals, error } = await query;
  
  if (error) {
    throw new Error(`Error fetching residuals from database: ${error.message}`);
  }
  
  context.totalRecords = dbResiduals.length;
  
  // Process each residual
  for (const dbResidual of dbResiduals) {
    try {
      // Fetch residual from API
      const apiResidual = await fetchResidualFromApi(
        context, 
        dbResidual.merchant_id, 
        dbResidual.month, 
        dbResidual.year
      );
      
      // Compare records
      const issues = compareRecords(
        'residual', 
        `${dbResidual.merchant_id}-${dbResidual.year}-${dbResidual.month}`, 
        apiResidual, 
        dbResidual, 
        fieldMappings.residuals
      );
      
      // Record any issues found
      if (issues.length > 0) {
        context.recordsWithIssues++;
        
        for (const issue of issues) {
          await context.supabase.rpc('add_validation_issue', {
            p_report_id: context.reportId,
            p_record_id: `${dbResidual.merchant_id}-${dbResidual.year}-${dbResidual.month}`,
            p_record_type: 'residual',
            p_issue_type: issue.issueType,
            p_issue_severity: issue.severity,
            p_api_value: issue.apiValue,
            p_db_value: issue.dbValue,
            p_field_path: issue.fieldPath,
            p_description: issue.description
          });
        }
      }
    } catch (err) {
      // Record error as an issue
      context.recordsWithIssues++;
      
      await context.supabase.rpc('add_validation_issue', {
        p_report_id: context.reportId,
        p_record_id: `${dbResidual.merchant_id}-${dbResidual.year}-${dbResidual.month}`,
        p_record_type: 'residual',
        p_issue_type: 'api_error',
        p_issue_severity: 'high',
        p_api_value: null,
        p_db_value: { 
          merchant_id: dbResidual.merchant_id,
          year: dbResidual.year,
          month: dbResidual.month
        },
        p_field_path: null,
        p_description: `Error validating residual: ${err.message}`
      });
    }
  }
}

// Validation function for agents
async function validateAgents(
  context: ValidationContext, 
  sampleSize: number,
  validateAll: boolean
): Promise<void> {
  // Get agent records from the database
  const { data: dbAgents, error } = await context.supabase
    .from('agents')
    .select('*')
    .limit(validateAll ? 1000000 : sampleSize);
  
  if (error) {
    throw new Error(`Error fetching agents from database: ${error.message}`);
  }
  
  context.totalRecords = dbAgents.length;
  
  // Process each agent
  for (const dbAgent of dbAgents) {
    try {
      // Fetch agent from API
      const apiAgent = await fetchAgentFromApi(context, dbAgent.agent_id);
      
      // Compare records
      const issues = compareRecords(
        'agent', 
        dbAgent.agent_id, 
        apiAgent, 
        dbAgent, 
        fieldMappings.agents
      );
      
      // Record any issues found
      if (issues.length > 0) {
        context.recordsWithIssues++;
        
        for (const issue of issues) {
          await context.supabase.rpc('add_validation_issue', {
            p_report_id: context.reportId,
            p_record_id: dbAgent.agent_id,
            p_record_type: 'agent',
            p_issue_type: issue.issueType,
            p_issue_severity: issue.severity,
            p_api_value: issue.apiValue,
            p_db_value: issue.dbValue,
            p_field_path: issue.fieldPath,
            p_description: issue.description
          });
        }
      }
    } catch (err) {
      // Record error as an issue
      context.recordsWithIssues++;
      
      await context.supabase.rpc('add_validation_issue', {
        p_report_id: context.reportId,
        p_record_id: dbAgent.agent_id,
        p_record_type: 'agent',
        p_issue_type: 'api_error',
        p_issue_severity: 'high',
        p_api_value: null,
        p_db_value: { agent_id: dbAgent.agent_id },
        p_field_path: null,
        p_description: `Error validating agent: ${err.message}`
      });
    }
  }
}

// API fetch functions
async function fetchMerchantFromApi(
  context: ValidationContext, 
  merchantId: string
): Promise<any> {
  const response = await fetch(
    `${context.apiBaseUrl}/merchants/${merchantId}`,
    {
      headers: {
        'Authorization': `Bearer ${context.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function fetchResidualFromApi(
  context: ValidationContext, 
  merchantId: string,
  month: string,
  year: string
): Promise<any> {
  const response = await fetch(
    `${context.apiBaseUrl}/merchants/${merchantId}/residuals/${year}/${month}`,
    {
      headers: {
        'Authorization': `Bearer ${context.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function fetchAgentFromApi(
  context: ValidationContext, 
  agentId: string
): Promise<any> {
  const response = await fetch(
    `${context.apiBaseUrl}/agents/${agentId}`,
    {
      headers: {
        'Authorization': `Bearer ${context.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Record comparison helpers
interface ValidationIssue {
  issueType: string; // 'missing', 'mismatch', 'data_type', etc.
  severity: string; // 'critical', 'high', 'medium', 'low'
  fieldPath: string;
  apiValue: any;
  dbValue: any;
  description: string;
}

function compareRecords(
  recordType: string,
  recordId: string,
  apiRecord: any,
  dbRecord: any,
  fieldMapping: Record<string, string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Convert API record to our field structure
  const normalizedApiRecord: Record<string, any> = {};
  
  for (const [dbField, apiField] of Object.entries(fieldMapping)) {
    // Extract value using dot notation if needed
    const apiValue = apiField.includes('.')
      ? apiField.split('.').reduce((obj, key) => obj?.[key], apiRecord)
      : apiRecord[apiField];
      
    normalizedApiRecord[dbField] = apiValue;
  }
  
  // Compare fields
  for (const [dbField, apiField] of Object.entries(fieldMapping)) {
    const dbValue = dbRecord[dbField];
    const apiValue = normalizedApiRecord[dbField];
    
    // Skip non-existent fields
    if (dbValue === undefined && apiValue === undefined) {
      continue;
    }
    
    // Check for missing values
    if (dbValue !== null && apiValue === undefined) {
      issues.push({
        issueType: 'missing_in_api',
        severity: 'medium',
        fieldPath: dbField,
        apiValue: null,
        dbValue,
        description: `Field ${dbField} exists in database but not in API response`
      });
      continue;
    }
    
    if (apiValue !== undefined && dbValue === null) {
      issues.push({
        issueType: 'missing_in_db',
        severity: 'high',
        fieldPath: dbField,
        apiValue,
        dbValue: null,
        description: `Field ${dbField} exists in API but is null in database`
      });
      continue;
    }
    
    // Compare values
    if (dbValue !== null && apiValue !== null) {
      // Handle different types of values
      if (typeof dbValue === 'number' && typeof apiValue === 'number') {
        // For numeric values, allow small differences due to floating point precision
        const tolerance = 0.01;
        if (Math.abs(dbValue - apiValue) > tolerance) {
          issues.push({
            issueType: 'mismatch',
            severity: 'high',
            fieldPath: dbField,
            apiValue,
            dbValue,
            description: `Numeric value mismatch in field ${dbField}`
          });
        }
      } else if (typeof dbValue === 'string' && typeof apiValue === 'string') {
        // For strings, normalize before comparing (trim and lowercase)
        const normalizedDb = dbValue.trim().toLowerCase();
        const normalizedApi = apiValue.trim().toLowerCase();
        
        if (normalizedDb !== normalizedApi) {
          issues.push({
            issueType: 'mismatch',
            severity: 'high',
            fieldPath: dbField,
            apiValue,
            dbValue,
            description: `String value mismatch in field ${dbField}`
          });
        }
      } else if (JSON.stringify(dbValue) !== JSON.stringify(apiValue)) {
        // For other types, do a deep comparison
        issues.push({
          issueType: 'mismatch',
          severity: 'high',
          fieldPath: dbField,
          apiValue,
          dbValue,
          description: `Value mismatch in field ${dbField}`
        });
      }
    }
  }
  
  return issues;
}
