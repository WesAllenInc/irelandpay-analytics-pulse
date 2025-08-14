import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Fetches all merchants from the database
 * @returns Array of merchants with their mid and merchant_dba
 */
export async function getMerchants() {
  const supabase = createSupabaseBrowserClient();
  try {
    const { data, error } = await supabase
      .from('merchant_data')
      .select('mid, merchant_dba')
      .order('merchant_dba');

    if (error) {
      console.error('Error fetching merchants:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMerchants:', error);
    throw error;
  }
}
