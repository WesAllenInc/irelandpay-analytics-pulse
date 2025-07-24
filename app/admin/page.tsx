import { createSupabaseServerClient } from '@/lib/supabase';
import React from 'react';

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();

  // Fetch merchants and users
  const { data: merchants } = await supabase.from('merchant_data').select('merchant_id, name').limit(100);
  const { data: users } = await supabase.from('users').select('id, email').limit(100);

  return (
    <div className="container mx-auto py-8 space-y-10">
      <h1 className="text-3xl font-bold mb-6">Admin Tools</h1>
      {/* Merchant-to-User Assignment Form */}
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Assign Merchants to Users</h2>
        <form action="/api/admin/assign-merchant" method="POST" className="flex flex-col gap-4">
          <label className="flex flex-col">
            Merchant
            <select name="merchantId" className="border rounded px-2 py-1">
              {merchants?.map((m: any) => (
                <option key={m.merchant_id} value={m.merchant_id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            Users (multi-select)
            <select name="userIds" multiple className="border rounded px-2 py-1 h-32">
              {users?.map((u: any) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-fit">Assign</button>
        </form>
      </section>
      {/* Manual Volume/BPS Input Form */}
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Manual Volume/BPS Input</h2>
        <form action="/api/admin/manual-volume" method="POST" className="flex flex-col gap-4">
          <label className="flex flex-col">
            Merchant
            <select name="merchantId" className="border rounded px-2 py-1">
              {merchants?.map((m: any) => (
                <option key={m.merchant_id} value={m.merchant_id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            Month
            <input type="month" name="month" className="border rounded px-2 py-1" required />
          </label>
          <label className="flex flex-col">
            Volume
            <input type="number" name="volume" className="border rounded px-2 py-1" required />
          </label>
          <label className="flex flex-col">
            BPS
            <input type="number" name="bps" className="border rounded px-2 py-1" required />
          </label>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-fit">Save</button>
        </form>
      </section>
    </div>
  );
} 