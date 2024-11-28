import {
  BaseQueryApi,
  BaseQueryArg,
  BaseQueryFn,
  createApi,
} from '@reduxjs/toolkit/query/react';
import { invoke, InvokeArgs } from '@tauri-apps/api/core';

type CustomBaseQueryArgs = {
  cmd: string;
  args?: InvokeArgs;
};

const customBaseQuery: BaseQueryFn<CustomBaseQueryArgs> = async (
  { cmd, args },
  api,
  extraOptions
) => {
  // Catch errors and _return_ them so the RTKQ logic can track it
  try {
    const data = await invoke(cmd, args);
    return { data };
  } catch (error) {
    return { error };
  }
};

export const tauriApi = createApi({
  reducerPath: 'tauriApi',
  baseQuery: customBaseQuery,
  endpoints: (builder) => ({
    getInstalledBranches: builder.query<Branch[], undefined>({
      query: () => ({ cmd: 'get_installed_branches' }),
    }),
  }),
});

export const { useGetInstalledBranchesQuery } = tauriApi;
