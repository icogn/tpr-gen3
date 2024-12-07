export type Branch = {
  id: number;
  branch_name: string;
  display_name: string;
  branch_version: string;
};

export type Config = {
  branches: Record<
    string,
    {
      name: string;
      owner: string;
      repo: string;
      publicKey: string;
    }
  >;
  central: Record<
    string,
    {
      branches: string[];
      releaseTag: string;
    }
  >;
  triggers: Record<string, string[]>;
};

export type PossibleBranch = {
  branch_name: string;
  version: string;
  display_name: string;
};

export type ResolvedBranch = {
  name: string;
  displayName: string;
  currentVersion?: string;
  latestVersion?: string;
};
