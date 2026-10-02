const value = v => v == null ? {type:'null'} : v instanceof Uint8Array ? {type:'blob',base64:Buffer.from(v).toString('base64')} : typeof v==='number' ? (Number.isInteger(v)?{type:'integer',value:String(v)}:{type:'float',value:v}) : {type:'text',value:String(v)};
const decode = v => v.type==='null' ? null : v.type==='integer' ? Number(v.value) : v.type==='blob' ? Buffer.from(v.base64,'base64') : v.value;
const result = r => ({results:r.rows.map(row=>Object.fromEntries(r.cols.map((col,i)=>[col.name,decode(row[i])]))),meta:{changes:r.affected_row_count}});
export class TursoDatabase {
  constructor(url,token,{fetcher=fetch}={}) {
    const endpoint=new URL(url.replace(/^libsql:/,'https:'));
    if(endpoint.protocol!=='https:')throw new Error('Turso requires HTTPS');
    endpoint.pathname='/v2/pipeline';this.endpoint=endpoint.href;this.token=token;this.fetcher=fetcher;
  }
  withSession(){return this;}
  prepare(sql){return new Statement(this,sql);}
  async pipeline(request) {
    const response=await this.fetcher(this.endpoint,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify({baton:null,requests:[{type:'execute',stmt:{sql:'PRAGMA foreign_keys=ON',args:[],want_rows:false}},request,{type:'close'}]}),signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Turso storage response ${response.status}`);
    const data=await response.json(), entry=data.results?.[1];
    if(data.results?.[0]?.type==='error')throw new Error(data.results[0].error.message);
    if(entry?.type==='error')throw new Error(entry.error.message);
    if(entry?.type!=='ok')throw new Error('Turso storage response missing');
    return entry.response.result;
  }
  async execute(statement) {return result(await this.pipeline({type:'execute',stmt:statement.payload()}));}
  async batch(statements) {
    if(!statements.length)return [];
    const steps=[{stmt:{sql:'BEGIN IMMEDIATE',args:[],want_rows:false}}];
    for(const statement of statements)steps.push({condition:{type:'ok',step:steps.length-1},stmt:statement.payload()});
    const commit=steps.length;
    steps.push({condition:{type:'ok',step:commit-1},stmt:{sql:'COMMIT',args:[],want_rows:false}});
    steps.push({condition:{type:'not',cond:{type:'ok',step:commit}},stmt:{sql:'ROLLBACK',args:[],want_rows:false}});
    const data=await this.pipeline({type:'batch',batch:{steps}});
    const failure=data.step_errors.find(Boolean);
    if(failure)throw new Error(failure.message);
    return data.step_results.slice(1,commit).map(result);
  }
}
class Statement {
  constructor(db,sql,values=[]){this.db=db;this.sql=sql;this.values=values;}
  bind(...values){return new Statement(this.db,this.sql,values);}
  payload(){return {sql:this.sql,args:this.values.map(value),want_rows:true};}
  async first(){return (await this.db.execute(this)).results[0]??null;}
  async all(){return this.db.execute(this);}
  async run(){return this.db.execute(this);}
}
export class DatabaseBucket {
  constructor(db){this.db=db;}
  async put(key,bytes){
    if(bytes.length>3*1024*1024)throw new Error('La foto o video admite hasta 3 MB. Elige un archivo más pequeño.');
    const statements=[];
    for(let offset=0,part=0;offset<bytes.length;offset+=256*1024,part++)statements.push(this.db.prepare('INSERT INTO asset_blob_parts (object_key,part,data) VALUES (?,?,?)').bind(key,part,bytes.slice(offset,offset+256*1024)));
    await this.db.batch(statements);
  }
  async get(key){
    const data=await this.db.prepare('SELECT data FROM asset_blob_parts WHERE object_key=? ORDER BY part').bind(key).all();
    return data.results.length ? {body:Buffer.concat(data.results.map(row=>row.data))} : null;
  }
}
