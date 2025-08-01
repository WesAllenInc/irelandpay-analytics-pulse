/**
 * DataTransformer class for normalizing and transforming raw Excel data.
 * Converted from Python implementation to TypeScript.
 */

export interface MerchantData {
  mid: string;
  merchant_dba: string;
  total_volume: number;
  total_txns: number;
  month: string;
  datasource: string;
  created_at: string;
}

export interface ResidualData {
  mid: string;
  net_profit: number;
  payout_month: string;
  created_at: string;
  id: string;
}

export interface MergedData extends MerchantData, ResidualData {
  profit_margin: number;
}

export class DataTransformer {
  // Standard column mappings for different file types
  static readonly MERCHANT_COLUMN_MAPPINGS: Record<string, string> = {
    // Common variations of merchant columns
    'merchant id': 'mid',
    'merchant_id': 'mid',
    'mid': 'mid',
    'merchant #': 'mid',
    'merchant no': 'mid',
    'merchant no.': 'mid',
    'id': 'mid',
    
    'merchant name': 'merchant_dba',
    'merchant_name': 'merchant_dba',
    'dba': 'merchant_dba',
    'dba name': 'merchant_dba',
    'business name': 'merchant_dba',
    'name': 'merchant_dba',
    
    'volume': 'total_volume',
    'processing volume': 'total_volume',
    'total volume': 'total_volume',
    'monthly volume': 'total_volume',
    'amount': 'total_volume',
    'sales': 'total_volume',
    
    'transactions': 'total_txns',
    'transaction count': 'total_txns',
    'txn count': 'total_txns',
    'txns': 'total_txns',
    'count': 'total_txns',
    'num transactions': 'total_txns',
  };

  static readonly RESIDUAL_COLUMN_MAPPINGS: Record<string, string> = {
    // Common variations of residual columns
    'merchant id': 'mid',
    'merchant_id': 'mid',
    'mid': 'mid',
    'merchant #': 'mid',
    'merchant no': 'mid',
    'merchant no.': 'mid',
    'id': 'mid',
    
    'net profit': 'net_profit',
    'profit': 'net_profit',
    'residual': 'net_profit',
    'commission': 'net_profit',
    'net commission': 'net_profit',
    'net residual': 'net_profit',
    'earnings': 'net_profit',
    'agent earnings': 'net_profit',
    'agent commission': 'net_profit',
    
    'basis points': 'bps',
    'bps': 'bps',
    'rate': 'bps',
    'commission rate': 'bps',
    'agent bps': 'bps',
    'agent rate': 'bps',
    
    'agent': 'agent_name',
    'agent name': 'agent_name',
    'rep': 'agent_name',
    'rep name': 'agent_name',
    'sales rep': 'agent_name',
    'sales agent': 'agent_name',
  };

  constructor() {
    console.info("Initialized DataTransformer");
  }

  /**
   * Normalize column names to standard format.
   */
  normalizeColumnNames(data: Record<string, any>[], fileType: 'merchant' | 'residual'): Record<string, any>[] {
    if (data.length === 0) return data;

    const mapping = fileType === 'merchant' 
      ? DataTransformer.MERCHANT_COLUMN_MAPPINGS 
      : DataTransformer.RESIDUAL_COLUMN_MAPPINGS;

    // Get column names from first row
    const originalColumns = Object.keys(data[0]);
    
    // Create mapping for column renaming
    const renameMap: Record<string, string> = {};
    
    originalColumns.forEach(col => {
      const normalizedCol = col.toLowerCase().trim();
      
      // Check for exact matches
      if (mapping[normalizedCol]) {
        renameMap[col] = mapping[normalizedCol];
        return;
      }
      
      // Check for partial matches
      for (const [key, value] of Object.entries(mapping)) {
        if (normalizedCol.includes(key)) {
          renameMap[col] = value;
          break;
        }
      }
    });

    // Apply renaming to all rows
    return data.map(row => {
      const newRow: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        const newKey = renameMap[key] || key;
        newRow[newKey] = value;
      });
      return newRow;
    });
  }

  /**
   * Clean and convert string values to numbers, handling currency formatting.
   */
  private cleanNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined || value === '') return 0;
    
    const stringValue = String(value).trim();
    if (stringValue === '') return 0;
    
    // Remove currency symbols, commas, and other formatting
    const cleaned = stringValue.replace(/[$,%]/g, '');
    
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Clean and standardize merchant data.
   */
  cleanMerchantData(data: Record<string, any>[], month: string): MerchantData[] {
    const requiredCols = ['mid', 'merchant_dba', 'total_volume', 'total_txns'];
    
    // Filter out rows with missing required data
    const cleanedData = data.filter(row => {
      return row.mid && row.merchant_dba && 
             (row.total_volume !== undefined && row.total_volume !== null) &&
             (row.total_txns !== undefined && row.total_txns !== null);
    });

    return cleanedData.map(row => ({
      mid: String(row.mid).replace(/[^a-zA-Z0-9]/g, '').trim(),
      merchant_dba: String(row.merchant_dba).trim(),
      total_volume: this.cleanNumericValue(row.total_volume),
      total_txns: this.cleanNumericValue(row.total_txns),
      month,
      datasource: `excel_import_${month}`,
      created_at: new Date().toISOString()
    }));
  }

  /**
   * Clean and standardize residual data.
   */
  cleanResidualData(data: Record<string, any>[], month: string): ResidualData[] {
    const cleanedData = data.filter(row => {
      return row.mid && 
             (row.net_profit !== undefined && row.net_profit !== null);
    });

    return cleanedData.map(row => ({
      mid: String(row.mid).replace(/[^a-zA-Z0-9]/g, '').trim(),
      net_profit: this.cleanNumericValue(row.net_profit),
      payout_month: month,
      created_at: new Date().toISOString(),
      id: `${String(row.mid).replace(/[^a-zA-Z0-9]/g, '')}_${month}`
    }));
  }

  /**
   * Transform data based on file type.
   */
  transformData(data: Record<string, any>[], fileType: 'merchant' | 'residual', month: string): Record<string, any>[] {
    // First normalize column names
    const normalizedData = this.normalizeColumnNames(data, fileType);
    
    // Then clean and standardize based on file type
    if (fileType === 'merchant') {
      return this.cleanMerchantData(normalizedData, month);
    } else {
      return this.cleanResidualData(normalizedData, month);
    }
  }

  /**
   * Merge merchant and residual data for the same month.
   */
  mergeMerchantResidualData(merchantData: MerchantData[], residualData: ResidualData[]): MergedData[] {
    // Create lookup maps for efficient merging
    const merchantMap = new Map(merchantData.map(m => [m.mid, m]));
    const residualMap = new Map(residualData.map(r => [r.mid, r]));

    // Get all unique merchant IDs
    const allMids = new Set([...merchantMap.keys(), ...residualMap.keys()]);

    return Array.from(allMids).map(mid => {
      const merchant = merchantMap.get(mid);
      const residual = residualMap.get(mid);

      const merged: MergedData = {
        mid,
        merchant_dba: merchant?.merchant_dba || '',
        total_volume: merchant?.total_volume || 0,
        total_txns: merchant?.total_txns || 0,
        month: merchant?.month || '',
        datasource: merchant?.datasource || '',
        created_at: merchant?.created_at || new Date().toISOString(),
        net_profit: residual?.net_profit || 0,
        payout_month: residual?.payout_month || '',
        id: residual?.id || `${mid}_${merchant?.month || ''}`,
        profit_margin: 0
      };

      // Calculate profit margin
      if (merged.total_volume > 0) {
        merged.profit_margin = (merged.net_profit / merged.total_volume) * 100;
      }

      return merged;
    });
  }
} 