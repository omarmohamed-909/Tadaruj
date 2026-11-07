import { useUiText } from "@/components/useUiText";
import React, { useState } from "react";
import { useGetAuditLogsQuery } from "@/features/api/authApi";
import BrandedLoader from "@/components/BrandedLoader";

const AuditLog = () => {
  const ui = useUiText();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetAuditLogsQuery(page);
  const logs = data?.logs ?? [];
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="border-b pb-6 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">{ui("Platform governance")}</p>
      <h1 className="mt-2 text-3xl font-bold">{ui("Activity log")}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{ui("Security-sensitive changes across accounts and access.")}</p>
    </header>
    {isLoading && <BrandedLoader />}
    {isError && <p role="alert" className="text-red-700">{ui("Could not load activity.")}</p>}
    {!isLoading && !isError && <div className="rounded-xl border border-border bg-card">
      {logs.length > 0 && <>
        <ul className="divide-y divide-border sm:hidden">
          {logs.map(log => (
            <li key={log._id} className="space-y-2 p-4 text-sm">
              <p className="break-words font-semibold">{log.action}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">{ui("When")}</dt><dd>{new Date(log.createdAt).toLocaleString()}</dd>
                <dt className="text-muted-foreground">{ui("By")}</dt><dd className="break-words">{log.actor?.name || ui("System")}</dd>
                <dt className="text-muted-foreground">{ui("Target")}</dt><dd className="break-all">{log.targetType} · {log.targetId}</dd>
              </dl>
            </li>
          ))}
        </ul>
        <table className="hidden w-full text-start text-sm sm:table">
          <thead className="bg-muted text-muted-foreground"><tr>{["When", "Action", "By", "Target"].map(label => <th key={label} className="p-4 text-start">{ui(label)}</th>)}</tr></thead>
          <tbody>{logs.map(log => <tr key={log._id} className="border-t border-border">
            <td className="p-4">{new Date(log.createdAt).toLocaleString()}</td><td className="p-4 font-medium">{log.action}</td>
            <td className="p-4">{log.actor?.name || ui("System")}</td><td className="break-all p-4">{log.targetType} · {log.targetId}</td>
          </tr>)}</tbody>
        </table>
      </>}
      {logs.length === 0 && <p className="p-6 text-muted-foreground">{ui("No activity on this page.")}</p>}
    </div>}
    <div className="flex gap-3"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">{ui("Previous")}</button><span className="self-center text-sm">{ui("Page")}{" "}{page}</span><button type="button" disabled={logs.length < 20} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">{ui("Next")}</button></div>
  </div>;
};

export default AuditLog;
