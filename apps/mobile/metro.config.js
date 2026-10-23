const path=require('node:path');
const deps=require('node:fs').realpathSync(path.resolve(__dirname,'../../node_modules'));
const {getDefaultConfig}=require(path.join(deps,'expo/metro-config'));
const config=getDefaultConfig(__dirname),out=path.resolve(__dirname,'../../.output');
// Metro's file-map writer does not create its parent directory on a cold start.
for(const directory of ['cache/metro-dev','cache/metro-dev-map','tmp','expo-home']){
 require('node:fs').mkdirSync(path.join(out,directory),{recursive:true});
}
config.resolver.nodeModulesPaths=[deps];config.watchFolders=[__dirname,require('node:fs').realpathSync(deps)];
config.cacheStores=[new (require(path.join(deps,'@expo/metro/metro-cache')).FileStore)({root:path.join(out,'cache/metro-dev')})];
config.fileMapCacheDirectory=path.join(out,'cache/metro-dev-map');
config.resolver.resolveRequest=(context,name,platform)=>{
 // The CLI advertises this monorepo entry through the readonly dependency junction.
 // Resolve only that synthetic-root request to the real watched dependency file.
 const entry=name==='./node_modules/expo-router/entry'&&path.resolve(context.originModulePath)===path.resolve(__dirname,'../..');
 const target=entry?require.resolve(path.join(deps,'expo-router/entry')):name.startsWith('@/')?path.join(__dirname,'src',name.slice(2)):name;
 const result=context.resolveRequest(context,target,platform);
 // Expo's NUL-prefixed virtual modules have no filesystem path to canonicalize.
 if(result.type==='sourceFile'&&!result.filePath.startsWith('\0')){
  const actual=require('node:fs').realpathSync(result.filePath),realDeps=require('node:fs').realpathSync(deps),served=path.dirname(realDeps);
  if(actual.startsWith(served+path.sep)&&!actual.startsWith(realDeps+path.sep))throw new Error('Fonte compartilhada recusada');
 }
 return result;
};
module.exports=config;
