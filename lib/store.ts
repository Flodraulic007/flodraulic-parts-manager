import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { MongoClient } from "mongodb";

/**
 * Minimal document store.
 *  - With MONGODB_URI set, documents live in MongoDB (database MONGODB_DB, default "flodraulic").
 *  - Otherwise they live in a JSON file at $DATA_DIR/db.json (default ./data/db.json).
 * Every document has a string `id`.
 */
export type CollectionName = "projects" | "parts" | "customers" | "settings" | "users" | "notifications" | "suppliers";

interface Doc {
  id: string;
}

interface Adapter {
  all<T extends Doc>(c: CollectionName): Promise<T[]>;
  get<T extends Doc>(c: CollectionName, id: string): Promise<T | null>;
  put<T extends Doc>(c: CollectionName, doc: T): Promise<void>;
  putMany<T extends Doc>(c: CollectionName, docs: T[]): Promise<void>;
  remove(c: CollectionName, id: string): Promise<void>;
  count(c: CollectionName): Promise<number>;
  /** Binary files (part documents). */
  putFile(id: string, data: Buffer, type: string): Promise<void>;
  getFile(id: string): Promise<{ data: Buffer; type: string } | null>;
  removeFile(id: string): Promise<void>;
}

type FileData = Record<string, Record<string, Doc>>;

const g = globalThis as typeof globalThis & {
  __fdStore?: Adapter;
  __fdMongo?: Promise<MongoClient>;
};

function fileAdapter(): Adapter {
  // Vercel/serverless file systems are read-only except /tmp (which is per-instance and not durable).
  const dir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/flodraulic-data" : path.join(process.cwd(), "data"));
  if (process.env.VERCEL && !process.env.DATA_DIR)
    console.warn("[store] No MONGODB_URI on Vercel: using /tmp, data will NOT persist. Set MONGODB_URI.");
  const file = path.join(dir, "db.json");
  let data: FileData | null = null;

  const load = (): FileData => {
    if (data) return data;
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8")) as FileData;
    } catch {
      data = {};
    }
    return data;
  };
  const save = () => {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  };
  const col = (c: CollectionName) => {
    const d = load();
    return (d[c] ??= {});
  };
  const clone = <T>(v: T): T => structuredClone(v);

  return {
    async all<T extends Doc>(c: CollectionName) {
      return Object.values(col(c)).map((d) => clone(d) as T);
    },
    async get<T extends Doc>(c: CollectionName, id: string) {
      const d = col(c)[id];
      return d ? (clone(d) as T) : null;
    },
    async put(c, doc) {
      col(c)[doc.id] = clone(doc);
      save();
    },
    async putMany(c, docs) {
      const target = col(c);
      for (const d of docs) target[d.id] = clone(d);
      save();
    },
    async remove(c, id) {
      delete col(c)[id];
      save();
    },
    async count(c) {
      return Object.keys(col(c)).length;
    },
    async putFile(id, buf, type) {
      const fdir = path.join(dir, "files");
      fs.mkdirSync(fdir, { recursive: true });
      fs.writeFileSync(path.join(fdir, safe(id)), buf);
      fs.writeFileSync(path.join(fdir, safe(id) + ".type"), type);
    },
    async getFile(id) {
      const p = path.join(dir, "files", safe(id));
      if (!fs.existsSync(p)) return null;
      const typeFile = p + ".type";
      return { data: fs.readFileSync(p), type: fs.existsSync(typeFile) ? fs.readFileSync(typeFile, "utf8") : "application/octet-stream" };
    },
    async removeFile(id) {
      const p = path.join(dir, "files", safe(id));
      fs.rmSync(p, { force: true });
      fs.rmSync(p + ".type", { force: true });
    },
  };
}

const safe = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

function mongoAdapter(uri: string): Adapter {
  const client = async () => {
    if (!g.__fdMongo) {
      const { MongoClient } = await import("mongodb");
      g.__fdMongo = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect().catch((e) => {
        g.__fdMongo = undefined;
        throw e;
      });
    }
    return g.__fdMongo;
  };
  const coll = async (c: CollectionName) =>
    // "hub_" prefix keeps this app's data apart from any existing collections (e.g. the legacy "parts").
    (await client()).db(process.env.MONGODB_DB || "flodraulic").collection<Doc & { _id: string }>(`hub_${c}`);
  const bucket = async () => {
    const { GridFSBucket } = await import("mongodb");
    return new GridFSBucket((await client()).db(process.env.MONGODB_DB || "flodraulic"), { bucketName: "hub_files" });
  };
  const strip = <T>(d: Record<string, unknown>): T => {
    const { _id, ...rest } = d;
    void _id;
    return rest as T;
  };
  return {
    async all<T extends Doc>(c: CollectionName) {
      const docs = await (await coll(c)).find({}).toArray();
      return docs.map((d) => strip<T>(d));
    },
    async get<T extends Doc>(c: CollectionName, id: string) {
      const d = await (await coll(c)).findOne({ _id: id });
      return d ? strip<T>(d) : null;
    },
    async put(c, doc) {
      await (await coll(c)).replaceOne({ _id: doc.id }, { ...doc, _id: doc.id }, { upsert: true });
    },
    async putMany(c, docs) {
      const col = await coll(c);
      for (let i = 0; i < docs.length; i += 500) {
        await col.bulkWrite(
          docs.slice(i, i + 500).map((doc) => ({
            replaceOne: { filter: { _id: doc.id }, replacement: { ...doc, _id: doc.id }, upsert: true },
          })),
          { ordered: false },
        );
      }
    },
    async remove(c, id) {
      await (await coll(c)).deleteOne({ _id: id });
    },
    async count(c) {
      return (await coll(c)).countDocuments();
    },
    async putFile(id, buf, type) {
      const b = await bucket();
      await this.removeFile(id);
      await new Promise<void>((resolve, reject) => {
        const s = b.openUploadStream(id, { metadata: { type } });
        s.on("finish", () => resolve());
        s.on("error", reject);
        s.end(buf);
      });
    },
    async getFile(id) {
      const b = await bucket();
      const [f] = await b.find({ filename: id }).limit(1).toArray();
      if (!f) return null;
      const chunks: Buffer[] = [];
      for await (const c of b.openDownloadStream(f._id)) chunks.push(c as Buffer);
      return { data: Buffer.concat(chunks), type: (f.metadata?.type as string) || "application/octet-stream" };
    },
    async removeFile(id) {
      const b = await bucket();
      for (const f of await b.find({ filename: id }).toArray()) await b.delete(f._id);
    },
  };
}

export function store(): Adapter {
  if (!g.__fdStore) {
    g.__fdStore = process.env.MONGODB_URI ? mongoAdapter(process.env.MONGODB_URI) : fileAdapter();
  }
  return g.__fdStore;
}
