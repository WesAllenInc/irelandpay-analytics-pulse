import { createClient } from './server';

export async function testSupabaseConnection() {
  try {
    const supabase = await createClient();
    
    // Simple query to test the connection
    const { data, error } = await supabase
      .from('merchant_data')
      .select('id, merchant_dba')
      .limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      message: 'Successfully connected to Supabase!',
      data 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
