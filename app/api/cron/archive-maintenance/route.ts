import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ArchiveManager } from '@/lib/archive/archive-manager';

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = headers().get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not set');
    return new Response('Server configuration error', { status: 500 });
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Invalid cron authorization header');
    return new Response('Unauthorized', { status: 401 });
  }

  const archiveManager = new ArchiveManager();
  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    tasks: [] as Array<{ task: string; status: string; details?: any }>,
    errors: [] as string[]
  };

  try {
    console.log('Starting archive maintenance process at', new Date().toISOString());

    // 1. Create future partitions
    try {
      await archiveManager.ensureFuturePartitions(3);
      results.tasks.push({ 
        task: 'future_partitions', 
        status: 'completed',
        details: 'Created partitions for next 3 months'
      });
    } catch (error: any) {
      results.tasks.push({ 
        task: 'future_partitions', 
        status: 'failed',
        details: error.message
      });
      results.errors.push(`Future partitions: ${error.message}`);
    }

    // 2. Archive historical data
    try {
      const archiveResult = await archiveManager.archiveHistoricalData();
      results.tasks.push({ 
        task: 'archive_historical_data', 
        status: 'completed',
        details: {
          archived: archiveResult.archived,
          duration: archiveResult.duration,
          errors: archiveResult.errors
        }
      });
    } catch (error: any) {
      results.tasks.push({ 
        task: 'archive_historical_data', 
        status: 'failed',
        details: error.message
      });
      results.errors.push(`Archive historical data: ${error.message}`);
    }

    // 3. Get retention statistics for monitoring
    try {
      const stats = await archiveManager.getRetentionStats();
      results.tasks.push({ 
        task: 'retention_stats', 
        status: 'completed',
        details: {
          totalRecords: stats.totalRecords,
          partitionCount: stats.partitionCount,
          totalSize: stats.totalSize
        }
      });

      // Check for storage growth alerts
      if (stats.sizeByMonth && stats.sizeByMonth.length >= 2) {
        const recentMonths = stats.sizeByMonth.slice(0, 2);
        const currentSize = parseInt(recentMonths[0].size.split(' ')[0]);
        const previousSize = parseInt(recentMonths[1].size.split(' ')[0]);
        
        if (currentSize > previousSize * 1.5) { // 50% growth
          results.tasks.push({ 
            task: 'storage_alert', 
            status: 'warning',
            details: `Storage growth detected: ${previousSize} -> ${currentSize} (${Math.round((currentSize/previousSize - 1) * 100)}% increase)`
          });
        }
      }

    } catch (error: any) {
      results.tasks.push({ 
        task: 'retention_stats', 
        status: 'failed',
        details: error.message
      });
      results.errors.push(`Retention stats: ${error.message}`);
    }

    // 4. Get partition health
    try {
      const partitionHealth = await archiveManager.getPartitionHealth();
      const unhealthyPartitions = partitionHealth.filter(p => !p.healthy);
      
      results.tasks.push({ 
        task: 'partition_health', 
        status: 'completed',
        details: {
          totalPartitions: partitionHealth.length,
          healthyPartitions: partitionHealth.length - unhealthyPartitions.length,
          unhealthyPartitions: unhealthyPartitions.length
        }
      });

      if (unhealthyPartitions.length > 0) {
        results.tasks.push({ 
          task: 'partition_optimization_needed', 
          status: 'warning',
          details: `${unhealthyPartitions.length} partitions need optimization`
        });
      }

    } catch (error: any) {
      results.tasks.push({ 
        task: 'partition_health', 
        status: 'failed',
        details: error.message
      });
      results.errors.push(`Partition health: ${error.message}`);
    }

    // 5. Database cleanup and optimization
    try {
      const supabase = createSupabaseServiceClient();
      
      // Analyze all partitions
      const { data: partitionsForAnalysis } = await supabase.rpc('get_partitions_for_analysis');
      
      if (partitionsForAnalysis && partitionsForAnalysis.length > 0) {
        for (const partition of partitionsForAnalysis) {
          await supabase.rpc('analyze_partition', { 
            partition_name: partition.name 
          });
        }
        
        results.tasks.push({ 
          task: 'partition_analysis', 
          status: 'completed',
          details: `Analyzed ${partitionsForAnalysis.length} partitions`
        });
      } else {
        results.tasks.push({ 
          task: 'partition_analysis', 
          status: 'skipped',
          details: 'No partitions needed analysis'
        });
      }

    } catch (error: any) {
      results.tasks.push({ 
        task: 'partition_analysis', 
        status: 'failed',
        details: error.message
      });
      results.errors.push(`Partition analysis: ${error.message}`);
    }

    // 6. Refresh materialized views
    try {
      const supabase = createSupabaseServiceClient();
      await supabase.rpc('refresh_summary_views');
      
      results.tasks.push({ 
        task: 'refresh_materialized_views', 
        status: 'completed',
        details: 'Refreshed merchant_monthly_summary view'
      });
    } catch (error: any) {
      results.tasks.push({ 
        task: 'refresh_materialized_views', 
        status: 'failed',
        details: error.message
      });
      results.errors.push(`Materialized views: ${error.message}`);
    }

    // Determine overall success
    const failedTasks = results.tasks.filter(t => t.status === 'failed');
    const warningTasks = results.tasks.filter(t => t.status === 'warning');
    
    if (failedTasks.length > 0) {
      results.success = false;
    }

    console.log('Archive maintenance completed:', {
      success: results.success,
      tasksCompleted: results.tasks.length,
      errors: results.errors.length,
      warnings: warningTasks.length
    });

    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('Archive maintenance failed:', error);
    
    results.success = false;
    results.errors.push(error.message);
    
    return NextResponse.json(results, { status: 500 });
  }
}

// Health check endpoint
export async function POST(request: Request) {
  try {
    const archiveManager = new ArchiveManager();
    const stats = await archiveManager.getRetentionStats();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        totalRecords: stats.totalRecords,
        partitionCount: stats.partitionCount,
        totalSize: stats.totalSize
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 500 });
  }
} 