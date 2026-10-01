// Native adapter: SQLite (Sprint 2).
// - Native (Android/iOS): @capacitor-community/sqlite
// - Web (browser preview): minimal Map-backed in-memory SQL engine with the same interface.
// v1 lesson: llama.rn was null on web and SecureStore needed lazy guards —
// v2 inverts this: the adapter owns platform branching; callers never branch.

import { splitStatements } from '../lib/domain/sql';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface DbAdapter {
  execute(sql: string, params?: unknown[]): Promise<number>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction(fn: (tx: Transaction) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

export interface Transaction {
  execute(sql: string, params?: unknown[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// CapacitorSQLiteAdapter
// ---------------------------------------------------------------------------

export class CapacitorSQLiteAdapter implements DbAdapter {
  constructor(private conn: unknown) {}

  async execute(sql: string, params: unknown[] = []): Promise<number> {
    const res = await (this.conn as any).execute(sql, params);
    return (res as { changes?: number }).changes ?? 0;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await (this.conn as any).query(sql, params);
    return (res as { values: T[] }).values;
  }

  async transaction(fn: (tx: Transaction) => Promise<void>): Promise<void> {
    const stmts: { sql: string; params: unknown[] }[] = [];
    const tx: Transaction = {
      execute: async (sql, p = []) => { void stmts.push({ sql, params: p }); },
    };
    await fn(tx);
    if (stmts.length === 0) return;
    try {
      await (this.conn as any).executeTransaction({
        transaction: stmts.map((s) => ({ statement: s.sql, values: s.params })),
      });
    } catch {
      // Fallback for plugins that lack executeTransaction.
      for (const s of stmts) {
        await (this.conn as any).execute(s.sql, s.params);
      }
    }
  }

  async close(): Promise<void> {
    await (this.conn as any).close();
  }
}

// ---------------------------------------------------------------------------
// WebSQLiteAdapter — minimal in-memory SQL engine
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
type ColumnDef = { name: string; type: string; notNull?: boolean; defaultValue?: string; primaryKey?: boolean };

function bindParams(sql: string, params: unknown[]): string {
  let out = '';
  let pi = 0;
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "'" && !inStr) { inStr = true; out += sql[i]; continue; }
    if (sql[i] === "'" && inStr) { inStr = false; out += sql[i]; continue; }
    if (sql[i] === '?' && !inStr && pi < params.length) {
      const v = params[pi++];
      if (v === null) out += 'NULL';
      else if (typeof v === 'string') out += `'${v.replace(/'/g, "''")}'`;
      else if (typeof v === 'number') out += String(v);
      else if (typeof v === 'boolean') out += v ? '1' : '0';
      else out += `'${String(v).replace(/'/g, "''")}'`;
      continue;
    }
    out += sql[i];
  }
  return out;
}

function parseValueList(s: string): unknown[] {
  const vals: unknown[] = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "'" && !inStr) { inStr = true; cur += s[i]; continue; }
    if (s[i] === "'" && inStr) { inStr = false; cur += s[i]; continue; }
    if (s[i] === ',' && !inStr) {
      vals.push(parseScalar(cur.trim()));
      cur = '';
      continue;
    }
    cur += s[i];
  }
  if (cur.trim() || vals.length > 0) vals.push(parseScalar(cur.trim()));
  return vals;
}

function parseScalar(raw: string): unknown {
  if (!raw || raw === 'NULL') return null;
  if (raw === 'TRUE') return 1;
  if (raw === 'FALSE') return 0;
  if (/^['"]/.test(raw)) return raw.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
  return raw;
}

function parseColumnDefs(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseColumnDef(def: string): ColumnDef | null {
  const m = def.match(/^(\w+)\s+(\w+)(.*)$/i);
  if (!m) return null;
  const col: ColumnDef = { name: m[1], type: m[2].toUpperCase() };
  const rest = m[3];
  if (/\bNOT\s+NULL\b/i.test(rest)) col.notNull = true;
  const dm = rest.match(/\bDEFAULT\s+([^,(]+\b|'[^']*')/i);
  if (dm) col.defaultValue = dm[1].trim().replace(/^'(.*)'$/, '$1');
  if (/\bPRIMARY\s+KEY\b/i.test(rest)) col.primaryKey = true;
  return col;
}

function parseSetClause(clause: string): [string, unknown][] {
  const assignments: [string, unknown][] = [];
  const parts = clause.split(',');
  for (const part of parts) {
    const m = part.trim().match(/^(\w+)\s*=\s*(.+)$/);
    if (m) assignments.push([m[1], parseScalar(m[2].trim())]);
  }
  return assignments;
}

class InMemoryEngine {
  private tables: Map<string, Map<string, Row>> = new Map();
  private schemas: Map<string, ColumnDef[]> = new Map();
  private userVersion = 0;
  private idSeq: Map<string, number> = new Map();
  private name: string;
  private transactionStack: Array<Map<string, Map<string, Row>>> = [];

  constructor(name: string) { this.name = name; }

  exec(sql: string, params: unknown[] = []): { rows?: Row[]; changes?: number; insertId?: string } {
    const stmts = splitStatements(sql);
    let last: { rows?: Row[]; changes?: number; insertId?: string } = {};
    for (const raw of stmts) {
      const s = bindParams(raw, params).trim();
      if (!s) continue;
      const verb = s.split(/\s+/)[0].toUpperCase();
      switch (verb) {
        case 'CREATE': this.execCreate(s); break;
        case 'DROP': this.execDrop(s); break;
        case 'INSERT': last = this.execInsert(s); break;
        case 'SELECT': last = { rows: this.execSelect(s) }; break;
        case 'UPDATE': last = { changes: this.execUpdate(s) }; break;
        case 'DELETE': last = { changes: this.execDelete(s) }; break;
        case 'PRAGMA': last = this.execPragma(s); break;
        case 'BEGIN': this.beginTransaction(); break;
        case 'COMMIT': this.commitTransaction(); break;
        case 'ROLLBACK': this.rollbackTransaction(); break;
        default: throw new Error(`Unsupported SQL verb: ${verb}`);
      }
    }
    return last;
  }

  setUserVersion(v: number): void { this.userVersion = v; }
  getUserVersion(): number { return this.userVersion; }

  private beginTransaction(): void {
    const snapshot = new Map<string, Map<string, Row>>();
    for (const [name, rows] of this.tables) {
      snapshot.set(name, new Map(rows));
    }
    this.transactionStack.push(snapshot);
  }

  private commitTransaction(): void {
    const snapshot = this.transactionStack.pop();
    if (snapshot) {
      this.tables = snapshot;
    }
  }

  private rollbackTransaction(): void {
    this.transactionStack.pop();
  }

  private currentTables(): Map<string, Map<string, Row>> {
    const snapshot = this.transactionStack[this.transactionStack.length - 1];
    return snapshot ?? this.tables;
  }

  private ensureTable(tableName: string): Map<string, Row> {
    if (!this.tables.has(tableName)) throw new Error(`Table ${tableName} does not exist`);
    return this.currentTables().get(tableName)!;
  }

  private replaceTable(tableName: string, table: Map<string, Row>): void {
    (this.currentTables()).set(tableName, table);
  }

  private execCreate(sql: string): void {
    const m = sql.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*)\)\s*$/i);
    if (m) {
      const tableName = m[1];
      const body = m[2];
      const rawCols = parseColumnDefs(body);
      const cols: ColumnDef[] = rawCols.map(parseColumnDef).filter((c): c is ColumnDef => c !== null);
      this.schemas.set(tableName, cols);
      const target = this.currentTables();
      if (!target.has(tableName)) target.set(tableName, new Map());
      return;
    }
    const im = sql.match(/^CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/i);
    if (im) {
      // Indexes are metadata-only in this fallback; real indexing is handled by sequential scan.
      return;
    }
    throw new Error(`Unsupported CREATE: ${sql}`);
  }

  private execDrop(sql: string): void {
    const m = sql.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
    if (m) {
      const target = this.currentTables();
      target.delete(m[1]);
      this.schemas.delete(m[1]);
      return;
    }
    throw new Error(`Unsupported DROP: ${sql}`);
  }

  private execInsert(sql: string): { changes: number; insertId: string } {
    const m = sql.match(/^INSERT\s+(OR\s+(IGNORE|REPLACE)\s+)?INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([\s\S]*)\)/i);
    if (!m) throw new Error(`Invalid INSERT: ${sql}`);
    const mode = (m[2] || '').toUpperCase();
    const tableName = m[3];
    const colList = m[4]?.trim();
    const valsStr = m[5];
    const schema = this.schemas.get(tableName);
    if (!schema) throw new Error(`Table ${tableName} does not exist`);
    const vals = parseValueList(valsStr);
    const row: Row = {};
    if (colList) {
      const cols = colList.split(',').map((c) => c.trim());
      for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
    } else {
      for (let i = 0; i < schema.length; i++) row[schema[i].name] = vals[i];
    }
    for (const col of schema) {
      if (!(col.name in row) && col.defaultValue !== undefined) {
        row[col.name] = parseScalar(col.defaultValue);
      }
    }
    if (!row.id) {
      const seq = (this.idSeq.get(tableName) ?? 0) + 1;
      this.idSeq.set(tableName, seq);
      row.id = `${this.name}_${tableName}_${seq}`;
    }
    const table = this.ensureTable(tableName);
    if (mode === 'IGNORE' && table.has(row.id as string)) {
      return { changes: 0, insertId: row.id as string };
    }
    if (mode === 'REPLACE' && table.has(row.id as string)) {
      table.delete(row.id as string);
    }
    table.set(row.id as string, row);
    const target = this.currentTables();
    const newTable = new Map(target.get(tableName)!);
    newTable.set(row.id as string, row);
    this.replaceTable(tableName, newTable);
    return { changes: 1, insertId: row.id as string };
  }

  private execSelect(sql: string): Row[] {
    const m = sql.match(
      /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?\s*;?\s*$/is,
    );
    if (!m) throw new Error(`Invalid SELECT: ${sql}`);
    const [, colsStr, tableName, where, orderCol, orderDir, limit] = m;
    const table = this.currentTables().get(tableName);
    let rows = Array.from(table?.values() ?? []);
    if (where) rows = rows.filter((row) => this.evalWhere(where, row));
    if (orderCol) {
      const dir = orderDir?.toUpperCase() === 'DESC' ? -1 : 1;
      rows.sort((a, b) => {
        const av = a[orderCol];
        const bv = b[orderCol];
        if (av === bv) return 0;
        if (av == null || av === '') return 1;
        if (bv == null || bv === '') return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    if (limit) rows = rows.slice(0, parseInt(limit, 10));
    if (colsStr.trim() !== '*') {
      const cols = colsStr.split(',').map((c) => c.trim());
      rows = rows.map((row) => {
        const r: Row = {};
        for (const c of cols) r[c] = row[c];
        return r;
      });
    }
    return rows;
  }

  private execUpdate(sql: string): number {
    const m = sql.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?\s*;?\s*$/is);
    if (!m) throw new Error(`Invalid UPDATE: ${sql}`);
    const tableName = m[1];
    const setClause = m[2];
    const where = m[3];
    const table = this.ensureTable(tableName);
    const assignments = parseSetClause(setClause);
    let changes = 0;
    for (const [, row] of table) {
      if (!where || this.evalWhere(where, row)) {
        for (const [col, val] of assignments) row[col] = val;
        changes++;
      }
    }
    const newTable = new Map(table);
    this.replaceTable(tableName, newTable);
    return changes;
  }

  private execDelete(sql: string): number {
    const m = sql.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?\s*;?\s*$/is);
    if (!m) throw new Error(`Invalid DELETE: ${sql}`);
    const tableName = m[1];
    const where = m[2];
    const table = this.ensureTable(tableName);
    if (!where) { const n = table.size; const newTable = new Map<string, Row>(); this.replaceTable(tableName, newTable); return n; }
    let changes = 0;
    const newTable = new Map<string, Row>();
    for (const [id, row] of table) {
      if (this.evalWhere(where, row)) { changes++; }
      else { newTable.set(id, row); }
    }
    this.replaceTable(tableName, newTable);
    return changes;
  }

  private execPragma(sql: string): { changes: number } {
    const setMatch = sql.match(/^PRAGMA\s+user_version\s*=\s*(\d+)/i);
    if (setMatch) { this.userVersion = parseInt(setMatch[1], 10); return { changes: 0 }; }
    if (sql.match(/^PRAGMA\s+user_version$/i)) return { changes: 0 };
    return { changes: 0 };
  }

  private evalWhere(where: string, row: Row): boolean {
    const conditions = where.split(/\s+AND\s+/i);
    return conditions.every((c) => this.evalCondition(c.trim(), row));
  }

  private evalCondition(cond: string, row: Row): boolean {
    const isNotNull = cond.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i);
    if (isNotNull) {
      const v = row[isNotNull[1]];
      return v != null && v !== '' && v !== false;
    }
    const isNull = cond.match(/^(\w+)\s+IS\s+NULL$/i);
    if (isNull) {
      const v = row[isNull[1]];
      return v == null;
    }
    const strEq = cond.match(/^(\w+)\s*(=|!=|<>)\s*'([^']*)'$/i);
    if (strEq) {
      const [, col, op, val] = strEq;
      const actual = String(row[col] ?? '');
      return op === '=' ? actual === val : actual !== val;
    }
    const numEq = cond.match(/^(\w+)\s*(=|!=|<>)\s*([\d.]+)$/);
    if (numEq) {
      const [, col, op, val] = numEq;
      const actual = Number(row[col] ?? 0);
      const numVal = parseFloat(val);
      return op === '=' ? actual === numVal : actual !== numVal;
    }
    return true;
  }
}

class WebSQLiteAdapter implements DbAdapter {
  private engine: InMemoryEngine;

  constructor(name: string) {
    this.engine = new InMemoryEngine(name);
  }

  async execute(sql: string, params: unknown[] = []): Promise<number> {
    const result = this.engine.exec(sql, params);
    return result.changes ?? 0;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = this.engine.exec(sql, params);
    return (result.rows ?? []) as T[];
  }

  async transaction(fn: (tx: Transaction) => Promise<void>): Promise<void> {
    const pending: { sql: string; params: unknown[] }[] = [];
    const tx: Transaction = {
      execute: async (sql, p = []) => { pending.push({ sql, params: p }); },
    };
    await fn(tx);
    if (pending.length === 0) return;
    this.engine.exec('BEGIN TRANSACTION');
    try {
      for (const { sql, params } of pending) {
        this.engine.exec(sql, params);
      }
      this.engine.exec('COMMIT');
    } catch (err) {
      try { this.engine.exec('ROLLBACK'); } catch (rollbackErr) { console.error('Rollback failed:', rollbackErr); }
      throw err;
    }
  }

  async close(): Promise<void> {
    // No-op for in-memory engine.
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function openDatabase(name: string): Promise<DbAdapter> {
  let CapacitorSQLite: any = null;
  try {
    const mod = await import('@capacitor-community/sqlite');
    CapacitorSQLite = mod.CapacitorSQLite;
  } catch {
    // package missing; fall back to web
  }

  if (CapacitorSQLite) {
    try {
      const conn = await CapacitorSQLite.createConnection({ database: name });
      await conn.open();
      const db = new CapacitorSQLiteAdapter(conn);
      const { migrate } = await import('../store/migrations');
      await migrate(db);
      return db;
    } catch {
      // connection failed; fall back to web
    }
  }

  const db = new WebSQLiteAdapter(name);
  const { migrate } = await import('../store/migrations');
  await migrate(db);
  return db;
}
