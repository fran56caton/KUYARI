import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
export class DB {
  connection: DatabaseSync;
  constructor(file: string) {
    if (file !== ':memory:') mkdirSync(dirname(resolve(file)), { recursive: true });
    this.connection = new DatabaseSync(file, { timeout: 5000 });
    this.connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;');
    this.connection.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    if (!this.get('SELECT version FROM migrations WHERE version=1')) {
      this.transaction(() => {
        this.connection.exec(readFileSync(resolve('migrations/001-commerce.sql'), 'utf8'));
        this.run('INSERT INTO migrations VALUES (1,?)', new Date().toISOString());
      });
    }
    if (!this.get('SELECT version FROM migrations WHERE version=2')) this.transaction(() => {
      this.connection.exec(readFileSync(resolve('migrations/002-whatsapp.sql'), 'utf8'));
      this.run('INSERT INTO migrations VALUES (2,?)', new Date().toISOString());
    });
    if (!this.get('SELECT version FROM migrations WHERE version=3')) this.transaction(() => {
      this.connection.exec(readFileSync(resolve('migrations/003-inquiry-products.sql'), 'utf8'));
      this.run('INSERT INTO migrations VALUES (3,?)', new Date().toISOString());
    });
    if (!this.get('SELECT version FROM migrations WHERE version=4')) this.transaction(() => {
      this.connection.exec(readFileSync(resolve('migrations/004-love-cards.sql'), 'utf8'));
      this.run('INSERT INTO migrations VALUES (4,?)', new Date().toISOString());
    });
  }
  get<T = Record<string, unknown>>(sql: string, ...values: SQLInputValue[]): T | undefined { return this.connection.prepare(sql).get(...values) as T | undefined; }
  all<T = Record<string, unknown>>(sql: string, ...values: SQLInputValue[]): T[] { return this.connection.prepare(sql).all(...values) as T[]; }
  run(sql: string, ...values: SQLInputValue[]) { return this.connection.prepare(sql).run(...values); }
  transaction<T>(fn: () => T): T { this.connection.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.connection.exec('COMMIT'); return result; } catch (e) { this.connection.exec('ROLLBACK'); throw e; } }
  audit(actor: string | null, action: string, resource: string) { this.run('INSERT INTO audit_logs VALUES (?,?,?,?,?)', randomUUID(), actor, action, resource, new Date().toISOString()); }
  close() { this.connection.close(); }
}
