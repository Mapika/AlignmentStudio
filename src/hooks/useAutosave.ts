import { useEffect, useRef } from 'react';

export const useAutosave = <T>(
  data: T,
  key: string,
  onSave: (data: T) => void,
  delay: number = 2000
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialRender = useRef(true);

  useEffect(() => {
    // Skip autosave on initial render
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(() => {
      onSave(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, key, onSave, delay]);
};
