import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {external,mobile,deps,out} from './tools.mjs';
process.env.NODE_ENV='production';process.env.EXPO_ROUTER_APP_ROOT=path.join(mobile,'app');
const {getDefaultConfig}=external('expo/metro-config');
const Metro=external('@expo/metro/metro');
const config=getDefaultConfig(mobile);
fs.mkdirSync(path.join(out,'cache/metro-map'),{recursive:true});fs.mkdirSync(path.join(out,'android'),{recursive:true});
// Preserve Expo startup modules when dependency discovery uses an external path.
const initialModules=config.serializer.getModulesRunBeforeMainModule;
config.serializer.getModulesRunBeforeMainModule=()=>[...initialModules(),external.resolve('expo/src/winter/index.ts'),external.resolve('@expo/metro-runtime')];
config.watchFolders=[mobile,deps];config.resolver.nodeModulesPaths=[deps];
config.resolver.resolveRequest=(context,name,platform)=>{
 if(name.startsWith('@/'))return context.resolveRequest(context,path.join(mobile,'src',name.slice(2)),platform);
 const result=context.resolveRequest(context,name,platform);
 if(result.type==='sourceFile'){
  const file=fs.realpathSync(result.filePath),served=path.dirname(deps);
  if(file.startsWith(served+path.sep)&&!file.startsWith(deps+path.sep))throw new Error('Shared source refused');
 }
 return result;
};
config.cacheStores=[new (external('@expo/metro/metro-cache').FileStore)({root:path.join(out,'cache/metro')})];
config.fileMapCacheDirectory=path.join(out,'cache/metro-map');config.maxWorkers=2;
const bundle=await Metro.runBuild(config,{entry:external.resolve('expo-router/entry'),platform:'android',dev:false,minify:true,out:path.join(out,'android/index.android.bundle'),sourceMap:true,customTransformOptions:{routerRoot:encodeURI(path.join(mobile,'app')),engine:'hermes'}});
const map=JSON.parse(fs.readFileSync(path.join(out,'android/index.android.bundle.map'),'utf8'));
const appSources=map.sources.filter(x=>x.startsWith(mobile+path.sep)&&!x.includes('?ctx='));
for(const required of ['app/(auth)/onboarding.tsx','app/(app)/home.tsx','src/services/IdentityService.ts','src/services/P2PService.ts','src/services/NonceClient.ts','src/services/SignalingConfig.ts','src/store/useAuthStore.ts'])if(!appSources.includes(path.join(mobile,required)))throw new Error('Bundle omitted '+required);
const sourcesOutsideIsolation=map.sources.filter(x=>path.isAbsolute(x)&&!x.startsWith(mobile+path.sep)&&!x.startsWith(deps+path.sep));
if(sourcesOutsideIsolation.length)throw new Error('Bundle source outside isolation');
const compiler=path.join(deps,'hermes-compiler/hermesc/win64-bin/hermesc.exe');
const hbc=path.join(out,'android/index.android.hbc'),compiled=spawnSync(compiler,['-O','-w','-emit-binary','-out',hbc,path.join(out,'android/index.android.bundle.js')],{encoding:'utf8'});
if(compiled.status!==0)throw new Error('Hermes compilation failed: '+(compiled.error?.code??compiled.status));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(path.join(out,'android-bundle.json'),JSON.stringify({node:process.version,codeBytes:Buffer.byteLength(bundle.code),platform:'android',offline:true,server:false,appSources,sources:map.sources.length,sourcesOutsideIsolation,hermes:{bytes:fs.statSync(hbc).size,sha256:sha(hbc)},bundleSha256:sha(path.join(out,'android/index.android.bundle.js'))},null,2));
console.log('Android offline bundle complete');
