import { createHash, randomUUID } from "node:crypto";
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
