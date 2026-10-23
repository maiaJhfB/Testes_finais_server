import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {root,out} from './tools.mjs';
const names=process.argv.slice(2);
const defaults=['check.mjs','check-architecture.mjs','check-config.mjs','test-services.mjs','test-ui.mjs','bundle-android.mjs'];
const run=Date.now(),results=[];fs.mkdirSync(path.join(out,'runs',String(run)),{recursive:true});
for(const script of names.length?names:defaults){
 const result=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,encoding:'utf8',env:process.env,maxBuffer:20*1024*1024});
 const log=path.join(out,'runs',String(run),script+'.log');fs.writeFileSync(log,(result.stdout??'')+(result.stderr??'')+(result.error?'\n'+String(result.error):''));
 results.push({script,exit:result.status,log:path.relative(root,log)});console.log(script+' exit '+result.status);
 fs.writeFileSync(path.join(out,'runs',String(run),'results.json'),JSON.stringify({node:process.version,run,results},null,2));
 if(result.status!==0){process.exitCode=1;break;}
}
