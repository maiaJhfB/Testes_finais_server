jest.mock('./IdentityService',()=>({identityService:{createSignedSession:jest.fn(),currentAddress:null}}));
jest.mock('expo-constants',()=>({__esModule:true,default:{expoConfig:{extra:{SIGNALING_SERVER_URL:'http://127.0.0.1:8787'}}}}));
import { useAuthStore } from '../store/useAuthStore';
import { identityService } from './IdentityService';
import { NONCE_TIMEOUT_MS } from './NonceClient';
beforeEach(()=>{useAuthStore.setState({status:'authenticated',address:'synthetic',session:{profile:{did:'synthetic'}} as any,error:null});jest.clearAllMocks();});
afterEach(()=>jest.useRealTimers());
test('store timeout clears prior session and never signs',async()=>{
  jest.useFakeTimers();global.fetch=jest.fn().mockImplementation((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))));
  const result=expect(useAuthStore.getState().login()).rejects.toThrow(/demorou/);
  await jest.advanceTimersByTimeAsync(NONCE_TIMEOUT_MS);await result;
  expect(identityService.createSignedSession).not.toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({status:'error',address:'synthetic',session:null});
});
