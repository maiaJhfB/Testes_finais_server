import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),mobile=path.join(root,'apps/mobile'),out=path.join(root,'.output');
export const deps=path.resolve(root,'../../../operacao-reparos-acesso/tcc-2026/node_modules');
export const external=createRequire(path.join(deps,'package.json'));
fs.mkdirSync(path.join(out,'tmp'),{recursive:true});
for(const key of ['TEMP','TMP','TMPDIR'])process.env[key]=path.join(out,'tmp');
Object.assign(process.env,{CI:'1',EXPO_OFFLINE:'1',EXPO_NO_DOTENV:'1',EXPO_NO_TELEMETRY:'1',__UNSAFE_EXPO_HOME_DIRECTORY:path.join(out,'expo-home'),XDG_CACHE_HOME:path.join(out,'cache'),BABEL_CACHE_PATH:path.join(out,'babel-cache.json')});
export function typecheck(){
 const ts=external('typescript'),original=JSON.parse(fs.readFileSync(path.join(mobile,'tsconfig.json'),'utf8'));
 const config={...original,extends:path.join(deps,'expo/tsconfig.base.json'),compilerOptions:{...original.compilerOptions,
  baseUrl:mobile,types:[path.join(deps,'@types/react'),path.join(deps,'@types/jest'),path.join(deps,'@types/node')],
  paths:{'@/*':[path.join(mobile,'src/*')],'react':[path.join(deps,'@types/react/index.d.ts')],'react/*':[path.join(deps,'@types/react/*')],'*':[path.join(deps,'*')],'event-target-shim/index':[path.join(deps,'react-native-webrtc/node_modules/event-target-shim/index.d.ts')]}}};
 const parsed=ts.parseJsonConfigFileContent(config,ts.sys,mobile);
 const program=ts.createProgram(parsed.fileNames,parsed.options),errors=[...parsed.errors,...ts.getPreEmitDiagnostics(program)];
 if(errors.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
 fs.writeFileSync(path.join(out,'typecheck-effective.json'),JSON.stringify({config,files:parsed.fileNames},null,2));
 return {files:parsed.fileNames.length,typescript:external('typescript').version,scope:'Original mobile tsconfig includes with installed Expo base, absolute dependency paths; tests included'};
}
export async function serviceBundle(){
 const file=path.join(out,'services.cjs');
 await external('esbuild').build({entryPoints:[path.join(root,'tests/service-entry.ts')],outfile:file,bundle:true,platform:'node',format:'cjs',target:'node20',nodePaths:[deps],
  alias:undefined,plugins:[{name:'native-boundaries',setup(build){
   build.onResolve({filter:/^expo-(constants|crypto|secure-store)$/},args=>({path:args.path,namespace:'native-fixture'}));
   build.onLoad({filter:/.*/,namespace:'native-fixture'},args=>({loader:'js',contents:args.path==='expo-constants'?`export default {get expoConfig(){return globalThis.__labConfig;}};`:args.path==='expo-crypto'?`import {randomBytes} from 'node:crypto';export async function getRandomBytesAsync(n){return new Uint8Array(randomBytes(n));}`:`export async function getItemAsync(k){return globalThis.__labStorage.getItemAsync(k)};export async function setItemAsync(k,v){return globalThis.__labStorage.setItemAsync(k,v)};export async function deleteItemAsync(k){return globalThis.__labStorage.deleteItemAsync(k)}`}));
   build.onResolve({filter:/^@\//},args=>({path:path.join(mobile,'src',args.path.slice(2))+'.ts'}));
  }}],logLevel:'silent'});return file;
}

