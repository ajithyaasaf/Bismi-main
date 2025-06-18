import { useState, useEffect } from 'react';

export function useSkeletonTimer(isLoading: boolean, minDisplayTime: number = 1000) {
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, minDisplayTime);

      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(true);
    }
  }, [isLoading, minDisplayTime]);

  return showSkeleton || isLoading;
}