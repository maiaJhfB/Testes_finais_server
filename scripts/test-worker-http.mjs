import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {out,external,serviceBundle} from './tools.mjs';import {startWorker} from './worker-runtime.mjs';
const {mf,url}=await startWorker();
try {
 const response=await fetch(new URL('/nonce',url),{headers:{Origin:'https://cooperativa-plataforma'}});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);
 assert.equal(response.headers.get('access-control-allow-origin'),'https://cooperativa-plataforma');
 const {nonce}=await response.json();assert.match(nonce,/^[a-f0-9]{32}$/);
 const again=await (await fetch(new URL('/nonce',url))).json();assert.match(again.nonce,/^[a-f0-9]{32}$/);assert.notEqual(nonce,again.nonce);
 const storage=new Map();globalThis.__labConfig={extra:{SIGNALING_SERVER_URL:url.origin}};
 globalThis.__labStorage={getItemAsync:async k=>storage.get(k)??null,setItemAsync:async(k,v)=>storage.set(k,v),deleteItemAsync:async k=>storage.delete(k)};
 const require=createRequire(import.meta.url),{useAuthStore}=require(await serviceBundle());
 await useAuthStore.getState().initialize();
 const address=await useAuthStore.getState().createNewWallet(),key=storage.get('cooperativa_wallet_pk');
 await useAuthStore.getState().login();assert.equal(useAuthStore.getState().session.profile.did,address);assert.equal(storage.get('cooperativa_wallet_pk'),key);
 fs.writeFileSync(path.join(out,'worker-http-results.json'),JSON.stringify({node:process.version,status:200,contentType:response.headers.get('content-type'),cors:response.headers.get('access-control-allow-origin'),nonceFormat:'32 hex characters',distinctNonces:true,realHttp:true,realEOA:true,clientStoreLogin:true,host:'127.0.0.1',port:'temporary assigned port',workerSource:'packages/signaling-worker/src/index.ts unchanged',miniflare:external('miniflare/package.json').version,boundaries:'temporary local HTTP and real Worker /nonce + client SIWE; SecureStore/RNG simulated; no phone or human API'},null,2));
 console.log('PASS real temporary loopback Worker HTTP /nonce and client login with same synthetic EOA');
}finally{await mf.dispose();}
