import { MemoryStore } from "../src/store/memory-store";
import { ensureDemoTasks, TASK_INVOICE, TASK_VENDOR } from "../src/lib/demo-data";
export async function freshStore() { const s = new MemoryStore(); await ensureDemoTasks(s); return s; }
export { TASK_INVOICE, TASK_VENDOR };
