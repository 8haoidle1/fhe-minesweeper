import { useState, useEffect, useCallback } from 'react';
import { initSDK, createInstance, SepoliaConfig, FhevmInstance } from '@zama-fhe/relayer-sdk/web';

let fhevmInstance: FhevmInstance | null = null;
let initPromise: Promise<FhevmInstance> | null = null;

export function useFhevm() {
  const [instance, setInstance] = useState<FhevmInstance | null>(fhevmInstance);
  const [isInitializing, setIsInitializing] = useState(!fhevmInstance);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (fhevmInstance) {
        setInstance(fhevmInstance);
        setIsInitializing(false);
        return;
      }

      if (initPromise) {
        try {
          const inst = await initPromise;
          setInstance(inst);
        } catch (err) {
          setError('Failed to initialize FHEVM SDK');
          console.error(err);
        }
        setIsInitializing(false);
        return;
      }

      try {
        initPromise = (async () => {
          // Initialize the SDK (WASM modules)
          await initSDK();

          // Create instance with Sepolia config
          const inst = await createInstance(SepoliaConfig);
          fhevmInstance = inst;
          return inst;
        })();

        const inst = await initPromise;
        setInstance(inst);
      } catch (err) {
        setError('Failed to initialize FHEVM SDK');
        console.error(err);
      }
      setIsInitializing(false);
    };

    init();
  }, []);

  const publicDecrypt = useCallback(async (handles: string[]) => {
    if (!instance) {
      throw new Error('FHEVM SDK not initialized');
    }

    try {
      const result = await instance.publicDecrypt(handles);
      return result;
    } catch (err) {
      console.error('Public decrypt failed:', err);
      throw err;
    }
  }, [instance]);

  return {
    instance,
    isInitializing,
    error,
    publicDecrypt,
  };
}
