import {
  BaseQueryApi,
  BaseQueryArg,
  BaseQueryFn,
  createApi,
} from '@reduxjs/toolkit/query/react';
import { invoke, InvokeArgs } from '@tauri-apps/api/core';
import { Branch, Config, PossibleBranch, ResolvedBranch } from '../types';
import { useMemo, version } from 'react';

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
    getPossibleBranches: builder.query<PossibleBranch[], undefined>({
      query: () => ({ cmd: 'get_possible_branches' }),
      transformResponse: (strResponse: string) => {
        return JSON.parse(strResponse) as Config;
      },
    }),
  }),
});

export const useBranchesQuery = () => {
  const { data: installedBranches, isLoading: isLoadingInstalledBranches } =
    tauriApi.useGetInstalledBranchesQuery();
  const { data: possibleBranches, isLoading: isLoadingConfig } =
    tauriApi.useGetPossibleBranchesQuery();
  console.log('config@@@@@@@@@@@@@@@@abcd');
  console.log(possibleBranches);

  // Need an ordered list of branches.

  // The order is installed at the top followed by the branches in the order in
  // the appropriate "central"

  const merged = useMemo<ResolvedBranch[]>(() => {
    // Only return once we have the installed branches info.
    if (installedBranches) {
      if (possibleBranches) {
        const results: ResolvedBranch[] = [];

        const obj: Record<string, PossibleBranch> = {};
        possibleBranches.forEach((possibleBranch) => {
          obj[possibleBranch.branch_name] = possibleBranch;
        });

        const handledNames: Record<string, boolean> = {};

        installedBranches.forEach((installedBranch) => {
          const name = installedBranch.branch_name;
          handledNames[name] = true;

          const possibleBranch = obj[name] || {};

          results.push({
            name,
            currentVersion: installedBranch.branch_version,
            latestVersion: possibleBranch.version,
            displayName: installedBranch.display_name,
          });
        });

        possibleBranches.forEach((possibleBranch) => {
          const name = possibleBranch.branch_name;
          if (handledNames[name]) {
            return;
          }

          results.push({
            name,
            latestVersion: possibleBranch.version,
            displayName: possibleBranch.display_name,
          });
        });

        return results;
      } else {
        return installedBranches.map<ResolvedBranch>((installedBranch) => ({
          name: installedBranch.branch_name,
          currentVersion: installedBranch.branch_version,
          displayName: installedBranch.display_name,
        }));
      }
    }

    return [];
  }, [installedBranches, possibleBranches]);

  return merged;
};

export const { useGetInstalledBranchesQuery } = tauriApi;
