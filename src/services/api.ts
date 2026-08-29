import { getFirebaseFunctions } from '@/lib/firebase/client';

export interface CallableFunctionOptions<TData> {
  functionName: string;
  data: TData;
}

export async function callFunction<TData, TResponse>(
  options: CallableFunctionOptions<TData>
): Promise<TResponse> {
  const functions = getFirebaseFunctions();

  if (!functions) {
    throw new Error('Firebase Functions not initialized');
  }

  const { httpsCallable } = await import('firebase/functions');
  const callable = httpsCallable<TData, TResponse>(functions, options.functionName);

  const result = await callable(options.data);

  return result.data;
}

export async function callFunctionWithEmulator<TData, TResponse>(
  functionName: string,
  data: TData,
  emulatorHost = 'localhost',
  emulatorPort = 5001
): Promise<TResponse> {
  const { getFunctions, connectFunctionsEmulator, httpsCallable } =
    await import('firebase/functions');
  const { initializeApp, getApps } = await import('firebase/app');

  const functions = getFunctions(
    getApps()[0] || initializeApp({ projectId: 'demo-project' }),
    'asia-south1'
  );
  connectFunctionsEmulator(functions, emulatorHost, emulatorPort);

  const callable = httpsCallable<TData, TResponse>(functions, functionName);
  const result = await callable(data);

  return result.data;
}
