import {
  BaseQueryApi,
  BaseQueryArg,
  BaseQueryFn,
  createApi,
} from '@reduxjs/toolkit/query/react';
import { invoke, InvokeArgs } from '@tauri-apps/api/core';
import { Branch, Config } from '../types';
import { useMemo } from 'react';

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
    getConfig: builder.query<Config, undefined>({
      query: () => ({ cmd: 'get_config' }),
      transformResponse: (strResponse: string) => {
        return JSON.parse(strResponse) as Config;
      },
    }),
  }),
});

export const useBranchesQuery = () => {
  const { data: installedBranches, isLoading: isLoadingInstalledBranches } =
    tauriApi.useGetInstalledBranchesQuery();
  const { data: config, isLoading: isLoadingConfig } =
    tauriApi.useGetConfigQuery();
  console.log('config');
  console.log(config);

  // Need an ordered list of branches.

  // The order is installed at the top followed by the branches in the order in
  // the appropriate "central"

  const merged = useMemo(() => {
    if (!installedBranches && !config) {
      return [];
    }
  }, [installedBranches, config]);

  return merged;
};

export const { useGetInstalledBranchesQuery } = tauriApi;
