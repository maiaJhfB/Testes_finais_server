import fs from 'node:fs';import path from 'node:path';
import {external,root,out} from './tools.mjs';
export async function prepareWorker(){
 const runtime=path.join(out,'worker-runtime');fs.mkdirSync(runtime,{recursive:true});
 const scriptPath=path.join(runtime,'worker.mjs');
 await external('esbuild').build({entryPoints:[path.join(root,'packages/signaling-worker/src/index.ts')],outfile:scriptPath,bundle:true,format:'esm',platform:'browser',target:'es2022',logLevel:'silent'});
 return {runtime,scriptPath};
}
export async function startWorker({host='127.0.0.1',port=0}={}){
 const {runtime,scriptPath}=await prepareWorker();
 // Miniflare's default .mf and all persistent state must stay off the readonly junction.
 process.chdir(runtime);
 const {Miniflare}=external('miniflare');
 const mf=new Miniflare({rootPath:runtime,modules:true,scriptPath,host,port,
  compatibilityDate:'2024-09-23',compatibilityFlags:['nodejs_compat'],
  kvNamespaces:['SIGNALING_KV'],kvPersist:path.join(runtime,'kv'),
  bindings:{ALLOWED_ORIGINS:'https://cooperativa-plataforma'},inspectorPort:0});
 try {const url=await mf.ready;return {mf,url};}catch(err){await mf.dispose();throw err;}
}
