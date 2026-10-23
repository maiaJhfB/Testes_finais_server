import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {root,mobile,out,external} from './tools.mjs';import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),source=JSON.parse(fs.readFileSync(path.join(mobile,'app.json'),'utf8').replace(/^\uFEFF/, '')).expo;
const configure=require(path.join(mobile,'app.config.js'));
delete process.env.EXPO_PUBLIC_SIGNALING_SERVER_URL;
const devPolicy=[];
for(const offline of [undefined,'0','1']){
 const env={...process.env};if(offline===undefined)delete env.EXPO_OFFLINE;else env.EXPO_OFFLINE=offline;
 const check=spawnSync(process.execPath,[path.join(root,'scripts/dev.mjs'),'metro','--check'],{cwd:root,env,encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);const summary=JSON.parse(check.stdout);
 assert.equal(summary.offline,offline??'CLI default');assert.equal(summary.startsServer,false);
 devPolicy.push({input:offline??'unset',effective:summary.offline});
}
assert.equal(process.env.EXPO_OFFLINE,'1','gate policy remains offline');
fs.writeFileSync(path.join(out,'dev-policy-results.json'),JSON.stringify({devPolicy,gatesOffline:process.env.EXPO_OFFLINE},null,2));
assert.deepEqual(configure({config:source}),source);
const invalid=['','ftp://example.com','http://user:password@example.com','http://example.com/path','http://example.com/?x=1','http://example.com/#x',' http://example.com'];
for(const value of invalid){process.env.EXPO_PUBLIC_SIGNALING_SERVER_URL=value;assert.throws(()=>configure({config:source}));}
process.env.EXPO_PUBLIC_SIGNALING_SERVER_URL='http://192.0.2.44:8787/';
const {exp}=external('@expo/config').getConfig(mobile,{skipSDKVersionRequirement:true});
assert.equal(exp.extra.SIGNALING_SERVER_URL,'http://192.0.2.44:8787');
assert.equal(exp.android.package,'br.com.cooperativa.plataforma');assert.deepEqual(exp.plugins,source.plugins);
assert.equal(exp.extra.POLYGON_RPC_URL,source.extra.POLYGON_RPC_URL);assert.equal(exp.extra.IDENTITY_CONTRACT_ADDRESS,source.extra.IDENTITY_CONTRACT_ADDRESS);
const metro=require(path.join(mobile,'metro.config.js'));assert.ok(metro.fileMapCacheDirectory.startsWith(out));
const sharedSource=path.join(path.dirname(fs.realpathSync(path.join(root,'node_modules'))),'apps/mobile/src/services/IdentityService.ts');
assert.throws(()=>metro.resolver.resolveRequest({originModulePath:path.join(root,'.'),resolveRequest:()=>({type:'sourceFile',filePath:sharedSource})},'untrusted-shared-source','android'),/Fonte compartilhada recusada/);
const virtual={type:'sourceFile',filePath:'\0polyfill:assets-registry'};
assert.equal(metro.resolver.resolveRequest({originModulePath:path.join(root,'.'),resolveRequest:()=>virtual},'assets-registry','android'),virtual);
const service=fs.readFileSync(path.join(mobile,'src/services/IdentityService.ts'),'utf8');
assert.match(service,/cooperativa_wallet_pk/);assert.match(service,/cooperativa_did/);assert.match(service,/chainId: 137/);assert.match(service,/domain: "cooperativa-plataforma"/);
const appDir=path.join(mobile,'app');const keys=fs.readdirSync(appDir,{recursive:true}).filter(x=>x.endsWith('.tsx')).map(x=>x.replaceAll('\\','/').replace(/\.tsx$/,''));
const expected=['_layout','index','(auth)/onboarding','(app)/home','(app)/active-ride','(app)/incoming-call','(app)/map-ride','(app)/profile','(app)/request-ride'];
assert.deepEqual([...keys].sort(),expected.sort());
delete process.env.EXPO_PUBLIC_SIGNALING_SERVER_URL;
fs.writeFileSync(path.join(out,'config-results.json'),JSON.stringify({node:process.version,defaultAPI:source.extra.SIGNALING_SERVER_URL,overrideTest:'http://192.0.2.44:8787',invalidRejected:invalid.length,package:exp.android.package,namespacePreserved:true,chain:137,pluginsUnchanged:true,metroCacheOwn:true,actualRouteKeys:keys,router:external('expo-router/package.json').version,expoHomeOwn:process.env.__UNSAFE_EXPO_HOME_DIRECTORY},null,2));
console.log('PASS Expo effective config, override validation, native package/namespace, own cache, exact real route keys');
