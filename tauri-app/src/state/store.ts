import { configureStore } from '@reduxjs/toolkit';
import { tauriApi } from './api-slice';

export const store = configureStore({
  reducer: {
    [tauriApi.reducerPath]: tauriApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tauriApi.middleware),
});

// optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
// setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
