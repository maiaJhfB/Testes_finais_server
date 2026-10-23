jest.mock('expo-constants',()=>({__esModule:true,default:{expoConfig:{extra:{SIGNALING_SERVER_URL:'http://127.0.0.1:8787/'}}}}));
import { fetchNonce, NONCE_TIMEOUT_MS } from './NonceClient';
afterEach(()=>jest.useRealTimers());
test('transport rejection has useful Portuguese connection message',async()=>{
  global.fetch=jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  await expect(fetchNonce()).rejects.toThrow(/Wi-Fi/);
});
test('timeout aborts and reports delay',async()=>{
  jest.useFakeTimers();
  global.fetch=jest.fn().mockImplementation((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))));
  const result=expect(fetchNonce()).rejects.toThrow(/demorou/);
  await jest.advanceTimersByTimeAsync(NONCE_TIMEOUT_MS);await result;
});
test('HTTP failure does not read JSON',async()=>{
  const json=jest.fn();global.fetch=jest.fn().mockResolvedValue({ok:false,status:503,json});
  await expect(fetchNonce()).rejects.toThrow(/HTTP 503/);expect(json).not.toHaveBeenCalled();
});
test('invalid JSON reports server response error',async()=>{
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>{throw new SyntaxError('bad json');}});
  await expect(fetchNonce()).rejects.toThrow(/resposta inválida/);
});
test.each([undefined,null,'', 'a'.repeat(31),'a'.repeat(33),'z'.repeat(32),123])('invalid nonce %s rejected',async nonce=>{
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({nonce})});
  await expect(fetchNonce()).rejects.toThrow(/código de acesso inválido/);
});
test('valid hex32 accepted using canonical shared URL',async()=>{
  const nonce='aB12'.repeat(8);global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({nonce})});
  await expect(fetchNonce()).resolves.toBe(nonce);
  expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/nonce',expect.objectContaining({signal:expect.anything()}));
});
