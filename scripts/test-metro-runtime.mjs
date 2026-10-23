import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import net from 'node:net';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {createHash} from 'node:crypto';import {root,mobile,out,external} from './tools.mjs';
const run=String(Date.now()),directory=path.join(out,'metro-runtime',run);
fs.mkdirSync(directory,{recursive:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const cache=path.join(out,'cache/metro-dev-map'),schema=path.join(out,'expo-home/schema-cache');
// Delete only these disposable, explicitly owned runtime directories, never shared dependencies.
for(const target of [cache,path.join(out,'cache/metro-dev'),schema]){
 assert.ok(path.resolve(target).startsWith(path.resolve(out)+path.sep));
 fs.rmSync(target,{recursive:true,force:true});
}
const results={node:process.version,run,offline:'1',network:'owned temporary loopback only',cases:[]};
const freePort=async()=>{const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;};
const get=async(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(180000)});
for(const phase of ['cold','warm']){
 const existedBefore=fs.existsSync(cache),filesBefore=existedBefore?fs.readdirSync(cache):[];
 assert.equal(existedBefore,phase==='warm');
 if(phase==='warm')assert.ok(filesBefore.some(name=>name.startsWith('metro-file-map-')));
 const port=await freePort(),logFile=path.join(directory,phase+'.log');let log='';
 const child=spawn(process.execPath,[external.resolve('expo/bin/cli'),'start','--dev-client','--localhost','--port',String(port),'--max-workers','1'],{
  cwd:mobile,stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1',EXPO_OFFLINE:'1',REACT_NATIVE_PACKAGER_HOSTNAME:'localhost',
   NODE_OPTIONS:'--require='+JSON.stringify(path.join(root,'tests/observe-loopback.cjs'))}});
 const capture=chunk=>{log+=chunk.toString();fs.writeFileSync(logFile,log);};
 child.stdout.on('data',capture);child.stderr.on('data',capture);
 let ownExit;child.once('exit',(code,signal)=>{ownExit={code,signal};});
 try{
  const base='http://localhost:'+port;
  let ready=false;const until=Date.now()+60000;
  while(Date.now()<until){
   if(ownExit)throw new Error('CLI exited before readiness: '+JSON.stringify(ownExit));
   try{const status=await fetch(base+'/status',{signal:AbortSignal.timeout(1000)});if(status.ok&&(await status.text()).includes('packager-status:running')){ready=true;break;}}catch{}
   await pause(300);
  }
  assert.ok(ready,'own CLI readiness within60s');
  const listeners=[...log.matchAll(/COOPERATIVA_OWN_LISTENER (\{[^\r\n]+\})/g)].map(match=>JSON.parse(match[1]));
  const listener=listeners.filter(item=>item.port===port).at(-1);assert.ok(listener,'actual owned listener observed');
  assert.ok(['127.0.0.1','::1'].includes(listener.address),'CLI bound only loopback');
  const response=await get(base+'/',{headers:{'expo-platform':'android','expo-protocol-version':'1',accept:'application/expo+json'}});
  assert.equal(response.status,200);const manifest=await response.json();
  fs.writeFileSync(path.join(directory,phase+'-manifest.json'),JSON.stringify(manifest,null,2));
  assert.equal(manifest.extra.expoClient.android.package,'br.com.cooperativa.plataforma');
  const url=manifest.launchAsset.url,bundleURL=new URL(url);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(bundleURL.hostname));assert.equal(Number(bundleURL.port),port);
  assert.equal(bundleURL.searchParams.get('platform'),'android');assert.equal(bundleURL.searchParams.get('dev'),'true');
  assert.equal(bundleURL.searchParams.get('transform.routerRoot'),'app');
  const bundleResponse=await get(url);const bundle=await bundleResponse.text();
  fs.writeFileSync(path.join(directory,phase+'.bundle'),bundle);
  assert.equal(bundleResponse.status,200,'bundle URL returned by real manifest');
  assert.ok(bundle.includes('expo-router'),'real router in dev bundle');
  assert.ok(bundle.includes('onboarding'),'real application routes in dev bundle');
  assert.ok(bundle.includes('cooperativa_wallet_pk'),'legacy identity source present');
  assert.ok(bundle.includes('winter'),'Expo runtime bootstrap present');
  const mapURL=new URL(url);mapURL.pathname=mapURL.pathname.replace(/\.bundle$/,'.map');
  const mapResponse=await get(mapURL);assert.equal(mapResponse.status,200,'real dev source map');
  const map=await mapResponse.json();
  fs.writeFileSync(path.join(directory,phase+'-map.json'),JSON.stringify(map));
  // The real dev map includes Metro's prelude and NUL virtual modules, not files.
  const virtualSources=map.sources.filter(source=>source==='__prelude__'||source.startsWith('\0'));
  const sources=map.sources.filter(source=>!virtualSources.includes(source)).map(source=>path.resolve(root,decodeURI(source)));
  for(const required of ['app/(auth)/onboarding.tsx','app/(app)/home.tsx','app/(app)/active-ride.tsx','src/services/IdentityService.ts','src/services/NonceClient.ts','src/store/useAuthStore.ts']){
   assert.ok(sources.includes(path.join(mobile,required)),'isolated dev graph includes '+required);
  }
  for(const required of ['expo/src/winter/index.ts','@expo/metro-runtime','@babel/runtime/helpers/asyncToGenerator']){
   assert.ok(sources.includes(external.resolve(required)),'dev graph includes real bootstrap/helper '+required);
  }
  const realDeps=fs.realpathSync(path.join(root,'node_modules'));
  const outside=sources.filter(source=>!source.startsWith(mobile+path.sep)&&!source.startsWith(realDeps+path.sep));
  assert.deepEqual(outside,[],'no source from another application tree');
  const cacheFiles=fs.readdirSync(cache).filter(name=>name.startsWith('metro-file-map-'));
  assert.ok(cacheFiles.length>0,'real file-map cache persisted');
  for(const file of cacheFiles)assert.ok(fs.statSync(path.join(cache,file)).size>0);
  assert.doesNotMatch(log,/\[metro-file-map\] Cache write error|ENOENT[^\r\n]*metro-dev-map/);
  assert.match(log,/Unable to resolve manifest assets/,'explicit offline cold schema warning is captured, not suppressed');
  const record={phase,cacheExistedBefore:existedBefore,cacheFilesBefore:filesBefore.length,listener,manifestStatus:response.status,
   bundleStatus:bundleResponse.status,bundleURL:url,bundleBytes:Buffer.byteLength(bundle),bundleSHA256:createHash('sha256').update(bundle).digest('hex'),
   mapStatus:mapResponse.status,graphSources:sources.length,virtualSources,isolatedAppSources:sources.filter(source=>source.startsWith(mobile+path.sep)),sourcesOutsideIsolation:outside,
   cacheFiles:cacheFiles.map(file=>({name:file,bytes:fs.statSync(path.join(cache,file)).size})),offlineSchemaWarning:true,
   limits:'HTTP/dev bundle on PC; no Android execution, online schema request, Wi-Fi or device test'};
  results.cases.push(record);console.log('PASS '+phase+': CLI real loopback, manifest/bundle200, file-map persisted');
 }finally{
  if(!ownExit){child.kill('SIGTERM');await Promise.race([once(child,'exit'),pause(10000)]);}
  assert.ok(ownExit,'owned CLI child terminated');
  const record=results.cases.find(item=>item.phase===phase);if(record)record.ownedChildExit=ownExit;
  fs.writeFileSync(logFile,log);fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(results,null,2));
 }
}
console.log(JSON.stringify({run,cases:results.cases.length,results:path.relative(root,path.join(directory,'results.json'))}));
