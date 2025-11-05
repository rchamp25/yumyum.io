import { useEffect, useRef } from 'react';

const useGameLoop = (callback: () => void) => {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      callback();
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback]);
};

export default useGameLoop;
