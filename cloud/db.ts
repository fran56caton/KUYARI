import {HttpError} from './security.js';
type Value=string|number|null;
export class DB {
  connection: D1DatabaseSession;
  pending:D1PreparedStatement[]|null=null;
  constructor(binding:D1Database, public bucket:R2Bucket, public assets:Fetcher, public origin:string) {this.connection=binding.withSession('first-primary');}
  stmt(sql:string, values:Value[]=[]) {return this.connection.prepare(sql).bind(...values);}
  async get<T=Record<string,unknown>>(sql:string,...values:Value[]):Promise<T|undefined>{return (await this.stmt(sql,values).first<T>())??undefined;}
  async all<T=Record<string,unknown>>(sql:string,...values:Value[]):Promise<T[]>{return (await this.stmt(sql,values).all<T>()).results;}
  async run(sql:string,...values:Value[]) {
    const stmt=this.stmt(sql,values);
    if(this.pending){this.pending.push(stmt);return {changes:1};}
    // Business mutations share an optimistic revision; visitor sessions do not
    // invalidate inventory transactions. The batch is atomic at D1.
    const guarded=/\b(products|product_images|product_variants|categories|delivery_zones|coupons|coupon_usages|orders|order_items|digital_memories|users|password_resets)\b/i.test(sql);
    const results=await this.connection.batch(guarded?[stmt,this.stmt("UPDATE mutation_guard SET version=version+1 WHERE id='commerce'")]:[stmt]);
    return {changes:results[0].meta.changes};
  }
  async transaction<T>(fn:()=>Promise<T>):Promise<T>{
    if(this.pending)throw new Error('Nested transaction is not supported');
    const revision=await this.get<{version:number}>("SELECT version FROM mutation_guard WHERE id='commerce'");
    if(!revision)throw new HttpError(503,'La tienda se está preparando. Recarga en unos segundos');
    this.pending=[];
    try {
      const result=await fn(), statements=this.pending;
      if(statements.length) {
        const assertion=crypto.randomUUID();
        await this.connection.batch([
          this.stmt("INSERT INTO transaction_checks (id,valid) SELECT ?,CASE WHEN version=? THEN 1 ELSE 0 END FROM mutation_guard WHERE id='commerce'",[assertion,revision.version]),
          ...statements,
          this.stmt("UPDATE mutation_guard SET version=version+1 WHERE id='commerce'"),
          this.stmt('DELETE FROM transaction_checks WHERE id=?',[assertion])
        ]);
      }
      return result;
    }catch(e){if(String(e).includes('CHECK constraint'))throw new HttpError(409,'La disponibilidad cambió. Actualiza el resumen e inténtalo nuevamente');throw e;}
    finally{this.pending=null;}
  }
  async audit(actor:string|null,action:string,resource:string){await this.run('INSERT INTO audit_logs VALUES (?,?,?,?,?)',crypto.randomUUID(),actor,action,resource,new Date().toISOString());}
  async staticText(path:string){return (await this.assets.fetch(new globalThis.Request(new URL(path,this.origin)))).text();}
}
