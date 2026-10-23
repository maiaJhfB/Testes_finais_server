const fs=require('node:fs'),path=require('node:path');
const deps=path.resolve(__dirname,'../../../../operacao-reparos-acesso/tcc-2026/node_modules');
const nativeResolver=require(path.join(deps,'react-native/jest/resolver.js'));
const served=path.dirname(deps),sourceN=path.resolve(__dirname,'../../../../operacao-reparo-teclado/tcc-2026');
const within=(file,root)=>file.toLowerCase().startsWith(root.toLowerCase()+path.sep);
module.exports=(request,options)=>{
 const result=nativeResolver(request,{...options,paths:[...(options.paths??[]),deps],moduleDirectory:[...(options.moduleDirectory??[]),deps]}),actual=fs.realpathSync(result);
 if((within(actual,served)&&!within(actual,deps))||within(actual,sourceN))throw new Error('Shared source resolution refused');return result;
};
