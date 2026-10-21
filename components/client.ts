"use client";
import { useCallback, useEffect, useState } from "react";

export async function api<T = any>(path: string, init?: RequestInit): Promise<T & { __status: number }> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  let data: any = {};
  try { data = await res.json(); } catch { /* non-json */ }
  if (!res.ok && !(res.status === 202 || res.status === 403 && data?.outcome)) throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
  return { ...data, __status: res.status };
}

export function useApi<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await api<T>(path)); setError(null); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

export function useSelectedTask(): [string, (id: string) => void] {
  const [id, setId] = useState("task-invoice-review");
  useEffect(() => { try { const v = localStorage.getItem("kaaval.task"); if (v) setId(v); } catch { /* ignore */ } }, []);
  return [id, (v) => { setId(v); try { localStorage.setItem("kaaval.task", v); } catch { /* ignore */ } }];
}
