import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { DB } from '../server/db.js';

// Vercel ejecuta este módulo como una función. No se llama app.listen().
const config = readConfig();
const db = new DB(config.DB_PATH);
const app = createApp(db, config);

export default app;
