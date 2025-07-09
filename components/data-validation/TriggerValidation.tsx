import { useState } from 'react';
import { useDataValidation } from '@/hooks/useDataValidation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

// Form schema using zod
const formSchema = z.object({
  dataType: z.enum(['merchants', 'residuals', 'agents']),
  syncScope: z.string().optional(),
  sampleSize: z.number().min(10).max(10000),
  validateAll: z.boolean().default(false),
});

export function TriggerValidation() {
  const { validateData, loading } = useDataValidation();
  const [activeTab, setActiveTab] = useState('merchants');
  const [showSyncScope, setShowSyncScope] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dataType: 'merchants',
      sampleSize: 100,
      validateAll: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await validateData({
      dataType: values.dataType,
      syncScope: values.syncScope,
      sampleSize: values.validateAll ? undefined : values.sampleSize,
      validateAll: values.validateAll,
    });
  };

  // Update form value when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    form.setValue('dataType', value as any);
    
    // Only show syncScope for residuals
    setShowSyncScope(value === 'residuals');
    if (value !== 'residuals') {
      form.setValue('syncScope', undefined);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Run Data Validation</CardTitle>
        <CardDescription>
          Compare API data with database records to identify discrepancies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="merchants">Merchants</TabsTrigger>
                <TabsTrigger value="residuals">Residuals</TabsTrigger>
                <TabsTrigger value="agents">Agents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="merchants">
                <p className="text-sm text-muted-foreground mb-4">
                  Validate merchant data including merchant details, IDs, status, and contact information.
                </p>
              </TabsContent>
              
              <TabsContent value="residuals">
                <p className="text-sm text-muted-foreground mb-4">
                  Validate residual data including processing volumes, revenue, and commissions.
                </p>
                
                <FormField
                  control={form.control}
                  name="syncScope"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Month (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="YYYY-MM (e.g. 2025-07)" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormDescription>
                        Specify month in YYYY-MM format to validate a specific month's data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="agents">
                <p className="text-sm text-muted-foreground mb-4">
                  Validate agent data including agent details, status, and commission rates.
                </p>
              </TabsContent>
            </Tabs>
            
            <FormField
              control={form.control}
              name="validateAll"
              render={({ field }: { field: any }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Validate All Records</FormLabel>
                    <FormDescription>
                      Check this to validate all records instead of using a sample
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {!form.getValues('validateAll') && (
              <FormField
                control={form.control}
                name="sampleSize"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Sample Size</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={10}
                        max={10000}
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value, 10) || 100)} 
                      />
                    </FormControl>
                    <FormDescription>
                      Number of records to sample (10-10,000)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Validation...
                </>
              ) : (
                'Start Validation'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>
          Validation runs in the background and may take several minutes to complete depending on data volume.
        </p>
      </CardFooter>
    </Card>
  );
}
