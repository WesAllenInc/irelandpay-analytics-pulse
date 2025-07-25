
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@/lib/supabase-compat';

const supabase = createClientComponentClient();
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Merchant {
  mid: string;
  merchant_dba: string;
}

interface MerchantSelectorProps {
  onMerchantSelect: (merchant: Merchant | null) => void;
  selectedMerchant: Merchant | null;
}

export function MerchantSelector({ onMerchantSelect, selectedMerchant }: MerchantSelectorProps) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchant_data')
        .select('mid, merchant_dba')
        .order('merchant_dba');

      if (error) throw error;

      // Remove duplicates by mid
      const uniqueMerchants = data?.reduce((acc: Merchant[], current: { mid: string; merchant_dba: string | null }) => {
        const exists = acc.find(item => item.mid === current.mid);
        if (!exists) {
          acc.push({
            mid: current.mid,
            merchant_dba: current.merchant_dba || current.mid
          });
        }
        return acc;
      }, []) || [];

      setMerchants(uniqueMerchants);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedMerchant
              ? `${selectedMerchant.merchant_dba} (${selectedMerchant.mid})`
              : "Select merchant..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search merchants..." />
            <CommandEmpty>No merchants found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              <CommandItem
                onSelect={() => {
                  onMerchantSelect(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selectedMerchant ? "opacity-100" : "opacity-0"
                  )}
                />
                All Merchants
              </CommandItem>
              {merchants.map((merchant) => (
                <CommandItem
                  key={merchant.mid}
                  onSelect={() => {
                    onMerchantSelect(merchant);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedMerchant?.mid === merchant.mid ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {merchant.merchant_dba} ({merchant.mid})
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
