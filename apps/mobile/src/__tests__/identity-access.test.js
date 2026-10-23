import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Onboarding from '../../app/(auth)/onboarding';
import { useAuthStore } from '../store/useAuthStore';
import { identityService } from '../services/IdentityService';

jest.mock('../services/IdentityService', () => ({ identityService: {
  currentAddress: null, generateNewWallet: jest.fn(), importWallet: jest.fn(),
  loadWallet: jest.fn(), createSignedSession: jest.fn(), deleteWallet: jest.fn(),
}}));
const did = '0x1234567890abcdef1234567890abcdef12345678';
const session = { profile: { did }, sessionToken: 'synthetic', expiresAt: Date.now()+10000 };
const disconnected = () => Promise.reject(new TypeError('Network request failed'));
beforeEach(() => {
  useAuthStore.setState({ status: 'no_wallet', address: null, error: null, session: null });
  identityService.currentAddress = null;
  jest.clearAllMocks();
  identityService.generateNewWallet.mockResolvedValue(did);
  identityService.importWallet.mockResolvedValue(did);
  identityService.loadWallet.mockResolvedValue(did);
  identityService.createSignedSession.mockResolvedValue(session);
  global.fetch = jest.fn(disconnected);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('real Continuar Alert callback resolves network rejection, clears spinner, retries same identity', async () => {
  const unhandled = jest.fn(); process.on('unhandledRejection', unhandled);
  try {
    render(<Onboarding />);
    fireEvent.press(screen.getByText('Criar Minha Identidade'));
    fireEvent.press(screen.getByText('Nova Identidade'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    const callback = Alert.alert.mock.calls[0][2][0].onPress;
    await act(async () => { await expect(callback()).resolves.toBeUndefined(); });
    expect(screen.getByRole('alert').props.children).toMatch(/Wi-Fi/);
    expect(screen.queryByText('Gerando chaves criptográficas...')).toBeNull();
    expect(screen.queryByText('Nova Identidade')).toBeNull();
    expect(screen.getByRole('button', {name:'Tentar entrar novamente'}).props.accessibilityState.disabled).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
    expect(identityService.createSignedSession).not.toHaveBeenCalled();
    global.fetch.mockResolvedValue({ok:true,json:async()=>({nonce:'a'.repeat(32)})});
    fireEvent.press(screen.getByText('Tentar entrar novamente'));
    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'));
    expect(identityService.generateNewWallet).toHaveBeenCalledTimes(1);
    expect(identityService.importWallet).not.toHaveBeenCalled();
    expect(identityService.deleteWallet).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  } finally { process.removeListener('unhandledRejection', unhandled); }
});

test('boot existing identity network failure offers retry without creation/import', async () => {
  await expect(useAuthStore.getState().initialize()).resolves.toBeUndefined();
  render(<Onboarding />);
  expect(screen.getByText('Sua identidade está salva')).toBeTruthy();
  expect(screen.getByRole('alert').props.children).toMatch(/Wi-Fi/);
  expect(screen.queryByText('Criar Minha Identidade')).toBeNull();
  global.fetch.mockResolvedValue({ok:true,json:async()=>({nonce:'b'.repeat(32)})});
  fireEvent.press(screen.getByText('Tentar entrar novamente'));
  await waitFor(() => expect(useAuthStore.getState().session).toEqual(session));
  expect(identityService.generateNewWallet).not.toHaveBeenCalled();
  expect(identityService.importWallet).not.toHaveBeenCalled();
});

test('import persists first; login failure is access error and clears private input', async () => {
  render(<Onboarding />);
  fireEvent.press(screen.getByText('Criar Minha Identidade'));
  fireEvent.press(screen.getByText('Importar Identidade'));
  fireEvent.changeText(screen.getByPlaceholderText('0x...'), 'synthetic-private-input');
  fireEvent.press(screen.getByText('Importar'));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').props.children).toMatch(/Wi-Fi/);
  expect(screen.queryByPlaceholderText('0x...')).toBeNull();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(identityService.importWallet).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().address).toBe(did);
});

test('duplicate creation taps and retry taps produce one pending operation', async () => {
  let finishCreate;
  identityService.generateNewWallet.mockReturnValue(new Promise(resolve => finishCreate=resolve));
  render(<Onboarding />); fireEvent.press(screen.getByText('Criar Minha Identidade'));
  const button = screen.getByText('Nova Identidade');
  fireEvent.press(button); fireEvent.press(button);
  expect(identityService.generateNewWallet).toHaveBeenCalledTimes(1);
  await act(async()=>finishCreate(did));
  let finishLogin;
  global.fetch.mockReturnValue(new Promise(resolve=>finishLogin=resolve));
  const retry=screen.getByText('Tentar entrar novamente');
  fireEvent.press(retry); fireEvent.press(retry);
  const pending=useAuthStore.getState().login();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await act(async()=>{finishLogin({ok:true,json:async()=>({nonce:'c'.repeat(32)})});await pending;});
  expect(identityService.createSignedSession).toHaveBeenCalledTimes(1);
});

test('storage load failure does not offer wallet replacement and retry consumes rejection', async () => {
  identityService.loadWallet.mockRejectedValue(new Error('synthetic storage failure'));
  await useAuthStore.getState().initialize();
  render(<Onboarding />); expect(screen.getByText('Recuperar acesso')).toBeTruthy();
  fireEvent.press(screen.getByText('Tentar entrar novamente'));
  await waitFor(()=>expect(identityService.loadWallet).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Criar Minha Identidade')).toBeNull();
  expect(identityService.generateNewWallet).not.toHaveBeenCalled();
});
