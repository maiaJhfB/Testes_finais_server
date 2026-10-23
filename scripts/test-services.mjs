import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {external,out,serviceBundle} from './tools.mjs';
const storage=new Map();let writes=0,deletes=0;globalThis.__labConfig={extra:{SIGNALING_SERVER_URL:'http://127.0.0.1:8787'}};
globalThis.__labStorage={getItemAsync:async k=>storage.get(k)??null,setItemAsync:async(k,v)=>{writes++;storage.set(k,v);},deleteItemAsync:async k=>{deletes++;storage.delete(k);}};
const require=createRequire(import.meta.url);const {identityService,useAuthStore}=require(await serviceBundle());
let generated=0,imported=0,signed=0;
const originalGenerate=identityService.generateNewWallet.bind(identityService),originalImport=identityService.importWallet.bind(identityService),originalSign=identityService.createSignedSession.bind(identityService);
identityService.generateNewWallet=async()=>{generated++;return originalGenerate();};
identityService.importWallet=async key=>{imported++;return originalImport(key);};
identityService.createSignedSession=async nonce=>{signed++;return originalSign(nonce);};
const groups=[];const group=async(name,fn)=>{await fn();groups.push(name);console.log('PASS '+name);};
let key,address;
await group('real EOA generation and failed access preserve exact stored key/address',async()=>{
 await useAuthStore.getState().initialize();
 address=await useAuthStore.getState().createNewWallet();key=storage.get('cooperativa_wallet_pk');
 assert.equal(new (external('ethers').Wallet)(key).address,address);
 globalThis.fetch=async()=>{throw new TypeError('Network request failed');};
 await assert.rejects(useAuthStore.getState().login(),/Wi-Fi/);
 assert.equal(storage.get('cooperativa_wallet_pk'),key);assert.equal(useAuthStore.getState().address,address);assert.equal(useAuthStore.getState().session,null);assert.equal(signed,0);
});
await group('retry signs real SIWE once with same identity and single pending login',async()=>{
 let finish;globalThis.fetch=()=>new Promise(resolve=>finish=resolve);
 const first=useAuthStore.getState().login(),second=useAuthStore.getState().login();assert.equal(first,second);
 finish({ok:true,json:async()=>({nonce:'a'.repeat(32)})});await first;
 assert.equal(useAuthStore.getState().session.profile.did,address);assert.equal(signed,1);assert.equal(generated,1);assert.equal(imported,0);assert.equal(storage.get('cooperativa_wallet_pk'),key);assert.equal(deletes,0);
});
await group('boot failure retains real saved EOA; retry uses no generation/import/deletion',async()=>{
 globalThis.fetch=async()=>{throw new TypeError('Network request failed');};
 await useAuthStore.getState().initialize();assert.equal(useAuthStore.getState().status,'error');assert.equal(useAuthStore.getState().session,null);assert.equal(useAuthStore.getState().address,address);assert.equal(storage.get('cooperativa_wallet_pk'),key);
 globalThis.fetch=async()=>({ok:true,json:async()=>({nonce:'b'.repeat(32)})});await useAuthStore.getState().login();
 assert.equal(useAuthStore.getState().session.profile.did,address);assert.equal(generated,1);assert.equal(imported,0);assert.equal(deletes,0);
});
for(const [name,response] of [
 ['HTTP failure',{ok:false,status:503}],
 ['malformed JSON',{ok:true,json:async()=>{throw new SyntaxError('bad');}}],
 ['missing nonce',{ok:true,json:async()=>({})}],
 ['non hex32 nonce',{ok:true,json:async()=>({nonce:'not-valid'})}],
])await group(name+' never signs or retains previous session',async()=>{
 const previous=signed;globalThis.fetch=async()=>response;
 await assert.rejects(useAuthStore.getState().login());assert.equal(signed,previous);assert.equal(useAuthStore.getState().session,null);assert.equal(useAuthStore.getState().status,'error');assert.equal(storage.get('cooperativa_wallet_pk'),key);
});
await group('existing identity blocks accidental import without key overwrite',async()=>{
 await assert.rejects(useAuthStore.getState().importWallet('0x'+'11'.repeat(32)),/Já existe/);
 assert.equal(storage.get('cooperativa_wallet_pk'),key);assert.equal(imported,0);assert.equal(deletes,0);
 await assert.rejects(useAuthStore.getState().createNewWallet(),/Já existe/);assert.equal(generated,1);
});
await group('legacy destructive logout semantics unchanged',async()=>{
 await useAuthStore.getState().logout();assert.equal(storage.has('cooperativa_wallet_pk'),false);assert.equal(deletes,2);assert.equal(useAuthStore.getState().status,'no_wallet');assert.equal(useAuthStore.getState().address,null);
});
fs.writeFileSync(path.join(out,'services-results.json'),JSON.stringify({node:process.version,groups,generated,imported,signed,writes,deletes,boundaries:'SecureStore Map and RNG node crypto fixture; ethers EOA and SIWE real; fetch simulated; no human keys or phone'},null,2));
