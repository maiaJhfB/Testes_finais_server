import React from 'react';
import { Text } from 'react-native';
import { act, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import Root from '../../app/_layout';
import Index from '../../app/index';
import { useAuthStore } from '../store/useAuthStore';
import { identityService } from '../services/IdentityService';

jest.mock('../services/IdentityService',()=>({identityService:{loadWallet:jest.fn(),createSignedSession:jest.fn()}}));
jest.mock('../store/useP2PStore',()=>({useP2PStore:()=>({initService:jest.fn()})}));
const context = {
  _layout: Root,
  index: Index,
  '(auth)/onboarding': ()=><Text>recovery-screen</Text>,
  '(app)/home': ()=>{mockHomeMount();React.useEffect(()=>{mockHomeEffect();},[]);return <Text>protected-home</Text>;},
  '(app)/active-ride': ()=><Text>active-ride</Text>,
  '(app)/incoming-call': ()=><Text>incoming-call</Text>,
  '(app)/map-ride': ()=><Text>map-ride</Text>,
  '(app)/profile': ()=><Text>profile</Text>,
  '(app)/request-ride': ()=><Text>request-ride</Text>,
};
const mockHomeMount=jest.fn(),mockHomeEffect=jest.fn();
beforeEach(()=>{
  mockHomeMount.mockClear();mockHomeEffect.mockClear();
  useAuthStore.setState({status:'idle',address:null,session:null,error:null});
  identityService.loadWallet.mockResolvedValue(null);
  global.fetch=jest.fn().mockRejectedValue(new TypeError('Network request failed'));
});
afterEach(()=>jest.useRealTimers());

test('installed Router discovers flat group children and actual Stack emits no route warning',async()=>{
  const warns=[];const original=console.warn;const spy=jest.spyOn(console,'warn').mockImplementation((...args)=>{warns.push(args);original(...args);});
  try {
    const rendered=renderRouter(context,{initialUrl:'/'});
    await screen.findByText('recovery-screen');
    const routes=rendered.getRouterState().routes.find(route=>route.name==='__root').state.routeNames;
    expect(routes).toEqual(expect.arrayContaining(['(auth)/onboarding','index']));
    expect(routes).not.toContain('(app)/home');
    expect(routes).not.toContain('(app)');expect(routes).not.toContain('(auth)');
    expect(warns.filter(args=>String(args[0]).includes('[Layout children]'))).toEqual([]);
  } finally {spy.mockRestore();}
});

test('real Router redirects failed boot away from protected home then navigates on retry success',async()=>{
  identityService.loadWallet.mockResolvedValue('0xsynthetic');
  identityService.createSignedSession.mockResolvedValue({profile:{did:'0xsynthetic'},sessionToken:'synthetic',expiresAt:Date.now()+10000});
  const rendered=renderRouter(context,{initialUrl:'/home'});
  await screen.findByText('recovery-screen');
  expect(rendered.getSegments()).toEqual(['(auth)','onboarding']);
  expect(screen.queryByText('protected-home')).toBeNull();
  expect(mockHomeMount).not.toHaveBeenCalled();expect(mockHomeEffect).not.toHaveBeenCalled();
  expect(useAuthStore.getState().session).toBeNull();
  global.fetch.mockResolvedValue({ok:true,json:async()=>({nonce:'a'.repeat(32)})});
  await act(async()=>useAuthStore.getState().login());
  await screen.findByText('protected-home');
  expect(rendered.getSegments()).toEqual(['(app)','home']);
  expect(mockHomeEffect).toHaveBeenCalledTimes(1);
  const authenticatedRoutes=rendered.getRouterState().routes.find(route=>route.name==='__root').state.routeNames;
  expect(authenticatedRoutes).toEqual(expect.arrayContaining(['(app)/home','(app)/map-ride']));
  await act(async()=>useAuthStore.setState({status:'error',session:null,error:'synthetic error'}));
  await waitFor(()=>expect(rendered.getSegments()).toEqual(['(auth)','onboarding']));
  expect(screen.queryByText('protected-home')).toBeNull();
  const errorRoutes=rendered.getRouterState().routes.find(route=>route.name==='__root').state.routeNames;
  expect(errorRoutes).not.toContain('(app)/home');
});
