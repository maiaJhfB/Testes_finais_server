import {external,out,root,deps} from './tools.mjs';import path from 'node:path';import fs from 'node:fs';
// runCLI does not set the environment like the jest CLI executable does.
process.env.NODE_ENV='test';
const {runCLI}=external('jest');
const targets=process.argv.slice(2);
const result=await runCLI({config:path.join(root,'scripts/jest.config.cjs'),runInBand:true,json:true,outputFile:path.join(out,targets.length?'jest-diagnostic.json':'jest-results.json'),...(targets.length?{runTestsByPath:true,_:targets}: {})},[root]);
console.log(JSON.stringify({passed:result.results.numPassedTests,failed:result.results.numFailedTests,suites:result.results.numTotalTestSuites}));
if(!result.results.success)process.exitCode=1;
