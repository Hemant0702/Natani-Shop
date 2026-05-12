// src/hooks/usePolling.ts
import { useEffect, useRef } from 'react';

/**
 * A robust polling hook with exponential backoff and stable callback handling.
 */
export function usePolling(fn: () => Promise<void>, baseMs = 5000) {
  const savedHandler = useRef(fn);
  const delay = useRef(baseMs);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Remember the latest handler
  useEffect(() => {
    savedHandler.current = fn;
  }, [fn]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await savedHandler.current();
        delay.current = baseMs; // Reset backoff on success
      } catch (error) {
        console.error('Polling error:', error);
        // Exponential backoff up to 30s
        delay.current = Math.min(delay.current * 2, 30_000);
      }
      
      if (active) {
        timer.current = setTimeout(run, delay.current);
      }
    };

    run();

    return () => {
      active = false;
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [baseMs]); // Only restart if baseMs changes
}