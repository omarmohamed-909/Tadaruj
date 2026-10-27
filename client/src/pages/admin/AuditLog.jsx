import React, { useState } from "react";
import { useGetAuditLogsQuery } from "@/features/api/authApi";
import BrandedLoader from "@/components/BrandedLoader";

const AuditLog = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetAuditLogsQuery(page);
  const logs = data?.logs ?? [];
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="border-b pb-6 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Platform governance</p>
      <h1 className="mt-2 text-3xl font-bold">Activity log</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Security-sensitive changes across accounts and access.</p>
    </header>
    {isLoading && <BrandedLoader />}
    {isError && <p role="alert" className="text-red-700">Could not load activity.</p>}
    {!isLoading && !isError && <div className="overflow-x-auto rounded-xl border dark:border-slate-800">
      <table className="w-full min-w-[650px] text-start text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="p-4 text-start">When</th><th className="p-4 text-start">Action</th><th className="p-4 text-start">By</th><th className="p-4 text-start">Target</th></tr></thead>
        <tbody>{logs.map((log) => <tr key={log._id} className="border-t dark:border-slate-800"><td className="p-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="p-4 font-medium">{log.action}</td><td className="p-4">{log.actor?.name || "System"}</td><td className="p-4">{log.targetType} · {log.targetId}</td></tr>)}</tbody>
      </table>
      {logs.length === 0 && <p className="p-6 text-slate-500">No activity on this page.</p>}
    </div>}
    <div className="flex gap-3"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><span className="self-center text-sm">Page {page}</span><button type="button" disabled={logs.length < 20} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div>
  </div>;
};

export default AuditLog;
