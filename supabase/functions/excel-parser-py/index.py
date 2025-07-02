import os
import json
import pandas as pd
from io import BytesIO
from supabase import create_client, Client

# Initialize Supabase client
def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("Missing Supabase credentials")
    
    return create_client(url, key)

def parse_date_from_filename(file_name):
    """Parse processing date from filename format like '_January2023_'"""
    import re
    from datetime import datetime
    
    match = re.search(r'_([A-Za-z]+)(\d{4})_', file_name)
    if match:
        month_name, year = match.groups()
        date = datetime.strptime(f"{month_name} 1, {year}", "%B 1, %Y")
        return f"{date.year}-{date.month:02d}-01"
    
    return datetime.now().strftime("%Y-%m-%d")

async def handle_request(req):
    try:
        # Get request data
        body = await req.json()
        file_key = body.get("fileKey")
        file_type = body.get("fileType")  # 'residuals' or 'volumes'
        file_name = body.get("fileName", "")
        
        if not file_key or not file_type:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing fileKey or fileType"})
            }
        
        # Validate file type
        if file_type not in ["residuals", "volumes"]:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Invalid fileType. Must be 'residuals' or 'volumes'"})
            }
        
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Download file from storage
        response = supabase.storage.from_("uploads").download(file_key)
        if not response:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": f"File not found: {file_key}"})
            }
        
        # Use pandas to read Excel file
        excel_data = BytesIO(response)
        df = pd.read_excel(excel_data)
        
        # Initialize tracking variables
        total_rows = len(df)
        rows_success = 0
        rows_failed = 0
        error_log = {}
        
        if file_type == "residuals":
            # Process residuals data
            processing_month = parse_date_from_filename(file_name)
            
            for i, row in df.iterrows():
                row_num = i + 2  # Excel rows are 1-indexed and we skip header
                try:
                    merchant_id = row.get('Merchant ID')
                    dba_name = row.get('DBA Name')
                    agent_name = row.get('Agent Name')
                    processor = row.get('Processor')
                    
                    if not merchant_id or not agent_name:
                        error_log[row_num] = "Missing Merchant ID or Agent Name"
                        rows_failed += 1
                        continue
                    
                    # Upsert agent
                    agent_result = supabase.table("agents").select("id").eq("agent_name", agent_name).execute()
                    agent_data = agent_result.data
                    
                    if not agent_data:
                        # Create new agent
                        agent_result = supabase.table("agents").insert({"agent_name": agent_name, "email": None}).execute()
                        agent_id = agent_result.data[0]["id"]
                    else:
                        agent_id = agent_data[0]["id"]
                    
                    # Upsert merchant
                    merchant_result = supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                    merchant_data = merchant_result.data
                    
                    if not merchant_data:
                        # Create new merchant
                        merchant_result = supabase.table("merchants").insert({
                            "merchant_id": merchant_id, 
                            "dba_name": dba_name,
                            "processor": processor,
                            "agent_id": agent_id
                        }).execute()
                        merchant_uuid = merchant_result.data[0]["id"]
                    else:
                        merchant_uuid = merchant_data[0]["id"]
                        # Update merchant data
                        supabase.table("merchants").update({
                            "dba_name": dba_name,
                            "processor": processor,
                            "agent_id": agent_id
                        }).eq("id", merchant_uuid).execute()
                    
                    # Check for existing residual
                    residual_result = supabase.table("residuals").select("id").match({
                        "merchant_id": merchant_uuid,
                        "processing_month": processing_month
                    }).execute()
                    
                    if not residual_result.data:
                        # Insert new residual
                        supabase.table("residuals").insert({
                            "merchant_id": merchant_uuid,
                            "processing_month": processing_month,
                            "net_residual": row.get('Net Residual'),
                            "fees_deducted": row.get('Fees Deducted'),
                            "final_residual": row.get('Final Residual'),
                            "office_bps": row.get('Office BPS'),
                            "agent_bps": row.get('Agent BPS'),
                            "processor_residual": row.get('Processor Residual')
                        }).execute()
                    
                    rows_success += 1
                    
                except Exception as e:
                    error_log[row_num] = str(e)
                    rows_failed += 1
                    
        elif file_type == "volumes":
            # Process volumes data
            for i, row in df.iterrows():
                row_num = i + 2  # Excel rows are 1-indexed and we skip header
                try:
                    merchant_id = row.get('Merchant ID')
                    dba_name = row.get('DBA Name')
                    processing_month_raw = row.get('Processing Month')
                    
                    if not merchant_id or not processing_month_raw:
                        error_log[row_num] = "Missing Merchant ID or Processing Month"
                        rows_failed += 1
                        continue
                    
                    # Parse processing month
                    if isinstance(processing_month_raw, str):
                        from datetime import datetime
                        pm = datetime.strptime(processing_month_raw, '%Y-%m-%d')
                    else:
                        pm = processing_month_raw
                        
                    processing_month = f"{pm.year}-{pm.month:02d}-01"
                    
                    # Upsert merchant
                    merchant_result = supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                    merchant_data = merchant_result.data
                    
                    if not merchant_data:
                        # Create new merchant
                        merchant_result = supabase.table("merchants").insert({
                            "merchant_id": merchant_id, 
                            "dba_name": dba_name
                        }).execute()
                        merchant_uuid = merchant_result.data[0]["id"]
                    else:
                        merchant_uuid = merchant_data[0]["id"]
                    
                    # Check for existing volume
                    volume_result = supabase.table("merchant_processing_volumes").select("id").match({
                        "merchant_id": merchant_uuid,
                        "processing_month": processing_month
                    }).execute()
                    
                    if not volume_result.data:
                        # Insert new volume
                        supabase.table("merchant_processing_volumes").insert({
                            "merchant_id": merchant_uuid,
                            "processing_month": processing_month,
                            "gross_volume": row.get('Gross Processing Volume'),
                            "chargebacks": row.get('Chargebacks'),
                            "fees": row.get('Fees'),
                            "estimated_bps": row.get('Estimated BPS')
                        }).execute()
                    
                    rows_success += 1
                    
                except Exception as e:
                    error_log[row_num] = str(e)
                    rows_failed += 1
        
        # Log ingestion results
        supabase.table("ingestion_logs").insert([{
            "file_name": file_name,
            "file_type": file_type,
            "status": "partial" if rows_failed > 0 else "success",
            "total_rows": total_rows,
            "rows_success": rows_success,
            "rows_failed": rows_failed,
            "error_log": error_log
        }]).execute()
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "fileName": file_name,
                "fileType": file_type,
                "totalRows": total_rows,
                "rowsSuccess": rows_success,
                "rowsFailed": rows_failed,
                "errorLog": error_log
            })
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Unexpected error: {str(e)}"})
        }

# Deno/Supabase Edge Function handler
def app(req):
    return handle_request(req)
