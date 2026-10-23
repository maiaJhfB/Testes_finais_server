import fs from 'node:fs';import path from 'node:path';import {root,out,typecheck} from './tools.mjs';
const result={node:process.version,typecheck:typecheck()};fs.writeFileSync(path.join(out,'typecheck.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
