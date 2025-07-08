import React, { useState, useEffect } from 'react';
import { useIncrementalSync } from '@/hooks/useIncrementalSync';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Clock, RefreshCw, Save, Trash } from 'lucide-react';

interface SyncSchedule {
  id?: string;
  data_type: string;
  sync_scope?: string | null;
  frequency: string; // 'hourly', 'daily', 'weekly', 'monthly'
  cron_expression: string;
  next_run: string;
  days?: string[];
  time_of_day?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SyncSchedulerProps {
  className?: string;
}

export function SyncScheduler({ className }: SyncSchedulerProps) {
  const supabase = useSupabaseClient();
  const { loading: syncLoading, error: syncError, triggerSync } = useIncrementalSync();
  
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSchedule, setNewSchedule] = useState<SyncSchedule>({
    data_type: 'merchants',
    frequency: 'daily',
    cron_expression: '0 0 * * *', // Default daily at midnight
    next_run: new Date().toISOString(),
    is_active: true,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('00:00');

  // Fetch schedules on component mount
  useEffect(() => {
    fetchSchedules();
  }, []);

  // Generate cron expression based on schedule settings
  useEffect(() => {
    if (newSchedule) {
      const cron = generateCronExpression(
        newSchedule.frequency,
        selectedTime,
        newSchedule.days || [],
        selectedDate
      );
      setNewSchedule({ ...newSchedule, cron_expression: cron });
    }
  }, [newSchedule.frequency, selectedTime, newSchedule.days, selectedDate]);

  // Fetch all sync schedules
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sync_schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to fetch schedules: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate cron expression based on UI inputs
  const generateCronExpression = (
    frequency: string,
    time: string = '00:00',
    days: string[] = [],
    date?: Date
  ): string => {
    const [hours, minutes] = time.split(':').map(Number);
    
    switch (frequency) {
      case 'hourly':
        return `0 * * * *`; // At minute 0 of every hour
      case 'daily':
        return `${minutes} ${hours} * * *`; // At specified time every day
      case 'weekly':
        // Default to Monday if no days selected
        const dayNums = days.length 
          ? days.map(day => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(day)) 
          : [1]; 
        return `${minutes} ${hours} * * ${dayNums.join(',')}`; // At specified time on specified days
      case 'monthly':
        // Default to 1st day if no date selected
        const dayOfMonth = date ? date.getDate() : 1;
        return `${minutes} ${hours} ${dayOfMonth} * *`; // At specified time on specified day of month
      default:
        return '0 0 * * *'; // Default to daily at midnight
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate next run time based on cron
      // In a real implementation, this would properly calculate based on the cron expression
      const nextRun = new Date();
      nextRun.setDate(nextRun.getDate() + 1);
      
      const scheduleData = {
        ...newSchedule,
        next_run: nextRun.toISOString(),
        days: newSchedule.frequency === 'weekly' ? newSchedule.days : null,
        time_of_day: selectedTime,
      };

      let response;
      if (isEditMode && editId) {
        // Update existing schedule
        response = await supabase
          .from('sync_schedules')
          .update(scheduleData)
          .eq('id', editId)
          .select();
      } else {
        // Insert new schedule
        response = await supabase
          .from('sync_schedules')
          .insert(scheduleData)
          .select();
      }

      if (response.error) throw response.error;

      toast({
        title: isEditMode ? 'Schedule Updated' : 'Schedule Created',
        description: `The ${newSchedule.data_type} sync schedule has been ${isEditMode ? 'updated' : 'created'}.`,
      });

      // Reset form and refresh list
      resetForm();
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to save schedule: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle editing an existing schedule
  const handleEdit = (schedule: SyncSchedule) => {
    setIsEditMode(true);
    setEditId(schedule.id || null);
    
    // Parse time from cron expression
    let timeValue = '00:00';
    const cronParts = schedule.cron_expression.split(' ');
    if (cronParts.length >= 2) {
      const minutes = cronParts[0];
      const hours = cronParts[1];
      if (hours !== '*' && minutes !== '*') {
        timeValue = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
    }
    setSelectedTime(timeValue);
    
    // Handle different frequencies
    if (schedule.frequency === 'monthly' && schedule.cron_expression) {
      // Extract day of month from cron
      const dayOfMonth = parseInt(schedule.cron_expression.split(' ')[2]);
      if (!isNaN(dayOfMonth)) {
        const date = new Date();
        date.setDate(dayOfMonth);
        setSelectedDate(date);
      }
    }
    
    setNewSchedule({
      ...schedule,
      // Ensure we have the days array for weekly schedules
      days: schedule.days || [],
    });
  };

  // Handle deleting a schedule
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sync_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Schedule Deleted',
        description: 'The sync schedule has been removed.',
      });

      fetchSchedules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete schedule: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle running a scheduled sync immediately
  const handleRunNow = async (schedule: SyncSchedule) => {
    try {
      const result = await triggerSync({
        dataType: schedule.data_type,
        syncScope: schedule.sync_scope || undefined,
        fullSync: false,
      });
      
      if (result) {
        toast({
          title: 'Sync Initiated',
          description: `Manual sync for ${schedule.data_type} has been started.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to start sync: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Reset form to default values
  const resetForm = () => {
    setIsEditMode(false);
    setEditId(null);
    setSelectedDate(new Date());
    setSelectedTime('00:00');
    setNewSchedule({
      data_type: 'merchants',
      frequency: 'daily',
      cron_expression: '0 0 * * *',
      next_run: new Date().toISOString(),
      is_active: true,
    });
  };

  // Day of week options for weekly schedules
  const daysOfWeek = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
    { value: 'sun', label: 'Sunday' },
  ];

  // Toggle selection of a day
  const toggleDay = (day: string) => {
    const days = newSchedule.days || [];
    const newDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day];
    setNewSchedule({ ...newSchedule, days: newDays });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Sync Scheduler</CardTitle>
        <CardDescription>Configure when data should be synchronized</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="schedules">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedules">Active Schedules</TabsTrigger>
            <TabsTrigger value="create">{isEditMode ? 'Edit Schedule' : 'Create Schedule'}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schedules">
            <div className="space-y-4">
              {loading ? (
                <p className="text-center py-4">Loading schedules...</p>
              ) : schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <Card key={schedule.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold capitalize">
                            {schedule.data_type} Sync
                            {schedule.sync_scope && ` (${schedule.sync_scope})`}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} • 
                            Next run: {format(new Date(schedule.next_run), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={schedule.is_active}
                            onCheckedChange={async (checked) => {
                              const { error } = await supabase
                                .from('sync_schedules')
                                .update({ is_active: checked })
                                .eq('id', schedule.id);
                                
                              if (!error) {
                                fetchSchedules();
                              } else {
                                toast({
                                  title: 'Error',
                                  description: `Failed to update schedule status: ${error.message}`,
                                  variant: 'destructive',
                                });
                              }
                            }}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="flex justify-between py-3">
                      <div className="text-xs text-muted-foreground">
                        <code>{schedule.cron_expression}</code>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunNow(schedule)}
                          disabled={syncLoading}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Run Now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => schedule.id && handleDelete(schedule.id)}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No sync schedules configured</p>
                  <Button onClick={() => document.querySelector('[data-value="create"]')?.click()}>
                    Create Your First Schedule
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="create">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data_type">Data Type</Label>
                <Select
                  value={newSchedule.data_type}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, data_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Data Types</SelectLabel>
                      <SelectItem value="merchants">Merchants</SelectItem>
                      <SelectItem value="residuals">Residuals</SelectItem>
                      <SelectItem value="agents">Agents</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {newSchedule.data_type === 'residuals' && (
                <div className="space-y-2">
                  <Label htmlFor="sync_scope">Month (YYYY-MM)</Label>
                  <Input
                    id="sync_scope"
                    type="text"
                    placeholder="e.g. 2025-07"
                    pattern="\d{4}-\d{2}"
                    value={newSchedule.sync_scope || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, sync_scope: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to sync current month
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={newSchedule.frequency}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Frequency</SelectLabel>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {newSchedule.frequency !== 'hourly' && (
                <div className="space-y-2">
                  <Label htmlFor="time">Time of Day</Label>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {newSchedule.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {daysOfWeek.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={newSchedule.days?.includes(day.value) ? "default" : "outline"}
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label.substring(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {newSchedule.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_active"
                  checked={newSchedule.is_active}
                  onCheckedChange={(checked) => setNewSchedule({ ...newSchedule, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="pt-2">
                <Label>Cron Expression</Label>
                <div className="mt-1 p-2 border rounded bg-muted font-mono text-sm">
                  {newSchedule.cron_expression}
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Update Schedule' : 'Create Schedule'}
                </Button>
                {isEditMode && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
