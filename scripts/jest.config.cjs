const path=require('node:path'),fs=require('node:fs');
const deps=path.resolve(__dirname,'../../../../operacao-reparos-acesso/tcc-2026/node_modules'),mobile=path.resolve(__dirname,'../apps/mobile');
const {watchPlugins,...android}=require(path.join(deps,'jest-expo/android/jest-preset'));
const resolver=path.join(__dirname,'jest-resolver.cjs');
const serviceTsconfig=path.resolve(__dirname,'../.output/tsconfig.jest.json');
fs.writeFileSync(serviceTsconfig,JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM'],module:'CommonJS',moduleResolution:'node',strict:true,esModuleInterop:true,skipLibCheck:true,isolatedModules:true,types:[path.join(deps,'@types/jest'),path.join(deps,'@types/node')]},include:[path.join(mobile,'src/services/*.test.ts')]},null,2));
module.exports={projects:[{
 ...android,displayName:'android-ui',rootDir:mobile,resolver,modulePaths:[deps],moduleDirectories:[deps,'node_modules'],
 testMatch:['<rootDir>/src/__tests__/*.test.js'],clearMocks:true,
 moduleNameMapper:{...android.moduleNameMapper,'^@/(.*)$':'<rootDir>/src/$1'},
 transform:{...android.transform,'\\.[jt]sx?$':[path.join(deps,'babel-jest'),{babelrc:false,configFile:false,presets:[path.join(deps,'babel-preset-expo')],caller:{name:'metro',bundler:'metro',platform:'android'}}]},
 cacheDirectory:path.resolve(__dirname,'../.output/cache/jest')
},{displayName:'services',rootDir:mobile,resolver,modulePaths:[deps],moduleDirectories:[deps,'node_modules'],moduleNameMapper:{'^@/(.*)$':'<rootDir>/src/$1'},testEnvironment:'node',testMatch:['<rootDir>/src/services/*.test.ts'],clearMocks:true,
 transform:{'^.+\\.tsx?$':[path.join(deps,'ts-jest'),{tsconfig:serviceTsconfig,diagnostics:false}]},
 cacheDirectory:path.resolve(__dirname,'../.output/cache/jest-services')}]};
