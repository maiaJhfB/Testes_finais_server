import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
// Gates default to offline; development follows the user's explicit CLI policy.
const offline=process.env.EXPO_OFFLINE;
const {root,mobile,out,deps,external}=await import('./tools.mjs');
if(offline===undefined)delete process.env.EXPO_OFFLINE;
else process.env.EXPO_OFFLINE=offline;
const [mode,...flags]=process.argv.slice(2);
if(!['worker','metro'].includes(mode)||flags.some(x=>x!=='--check'))throw new Error('Uso: node scripts/dev.mjs worker|metro [--check]');
const {getConfig}=external('@expo/config');
const {exp}=getConfig(mobile,{skipSDKVersionRequirement:true});
if(exp.android?.package!=='br.com.cooperativa.plataforma')throw new Error('Pacote inesperado');
const summary={mode,check:flags.includes('--check'),node:process.version,api:exp.extra.SIGNALING_SERVER_URL,
 package:exp.android.package,router:external('expo-router/package.json').version,
 deps:'readonly '+deps,cache:out,offline:process.env.EXPO_OFFLINE??'CLI default',startsServer:!flags.includes('--check')};
console.log(JSON.stringify(summary,null,2));
if(flags.includes('--check'))process.exit(0);
if(mode==='worker'){
 const {startWorker}=await import('./worker-runtime.mjs');
 const {mf}=await startWorker({host:'0.0.0.0',port:8787});
 console.log('Worker legado disponível na porta8787. Deixe este terminal aberto.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await mf.dispose();process.exit(0);});
}else{
 delete process.env.CI;
 // This mode is started only by Vitor. No device-open flags, installs or source copies.
 const child=spawn(process.execPath,[external.resolve('expo/bin/cli'),'start','--dev-client','--lan'],{cwd:mobile,stdio:'inherit',env:process.env});
 child.on('exit',code=>process.exit(code??1));
}
