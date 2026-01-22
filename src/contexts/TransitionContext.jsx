import React, { createContext, useContext, useState, useCallback } from 'react';

const TransitionContext = createContext();

export const TransitionProvider = ({ children }) => {
  const [transitionData, setTransitionData] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = useCallback((data) => {
    setTransitionData(data);
    setIsTransitioning(true);
  }, []);

  const endTransition = useCallback(() => {
    setIsTransitioning(false);
    // Keep data for return animation
    setTimeout(() => setTransitionData(null), 600);
  }, []);

  return (
    <TransitionContext.Provider
      value={{
        transitionData,
        isTransitioning,
        startTransition,
        endTransition,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
};

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within TransitionProvider');
  }
  return context;
};
