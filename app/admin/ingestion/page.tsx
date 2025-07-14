'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { IngestionResult } from '@/lib/ingestion';

const supabase = createSupabaseBrowserClient();

export default function IngestionPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<IngestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth/login');
      } else if (session.user.user_metadata?.role !== 'admin') {
        router.replace('/');
      } else {
        loadLogs();
      }
    })();
  }, [router]);

  async function loadLogs() {
    const { data } = await supabase
      .from('ingestion_logs')
      .select('*')
      .order('upload_timestamp', { ascending: false });
    setLogs(data ?? []);
  }

  async function handleUpload() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/auth/login'); return; } else if (session.user.user_metadata?.role !== 'admin') { router.replace('/'); return; }
    if (!files) return;
    setLoading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));

    const res = await fetch('/api/ingestion', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setResults(data.results as IngestionResult[]);
    await loadLogs();
    setLoading(false);
  }

  function exportErrors(log: any) {
    const blob = new Blob([JSON.stringify(log.error_log, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${log.file_name}_errors.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Data Ingestion</h1>

      <section className="border p-4 rounded">
        <label htmlFor="file-input" className="block mb-2 font-medium">Select Excel files (.xlsx)</label>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".xlsx"
          onChange={(e) => setFiles(e.target.files)}
          className="block mb-2"
          title="Select Excel files (.xlsx)"
        />
        <button
          onClick={handleUpload}
          disabled={!files || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Upload & Ingest'}
        </button>
      </section>

      {results.length > 0 && (
        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Ingestion Results</h2>
          <ul className="list-disc pl-5">
            {results.map((r, idx) => (
              <li key={idx}>
                {r.dataSource}: {r.rowsSuccess}/{r.totalRows} success, {r.rowsFailed} failed
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border p-4 rounded">
        <h2 className="font-semibold mb-2">Ingestion History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1">Timestamp</th>
                <th className="px-2 py-1">File</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Rows</th>
                <th className="px-2 py-1">Failed</th>
                <th className="px-2 py-1">Errors</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-2 py-1">{new Date(log.upload_timestamp).toLocaleString()}</td>
                  <td className="px-2 py-1">{log.file_name}</td>
                  <td className="px-2 py-1">{log.file_type}</td>
                  <td className="px-2 py-1">{log.status}</td>
                  <td className="px-2 py-1">{log.total_rows}</td>
                  <td className="px-2 py-1">{log.rows_failed}</td>
                  <td className="px-2 py-1">
                    {log.rows_failed > 0 && (
                      <button
                        onClick={() => exportErrors(log)}
                        className="text-blue-600 underline"
                      >
                        Export
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
