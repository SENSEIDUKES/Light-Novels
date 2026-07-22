import type { FirebaseApp } from 'firebase/app';
import {
  connectDataConnectEmulator,
  getDataConnect,
  terminate,
  type DataConnect,
  type ExecuteQueryOptions,
} from 'firebase/data-connect';
import {
  connectorConfig,
  createMyChapter,
  createStoryWithFirstChapter,
  getMyAccount,
  getMyChapter,
  getMyMediaAsset,
  getMyStory,
  listMyMediaAssets,
  listMyStories,
  softDeleteMyStory,
  upsertMyAccount,
  type CreateMyChapterVariables,
  type CreateStoryWithFirstChapterVariables,
  type GetMyChapterVariables,
  type GetMyMediaAssetVariables,
  type GetMyStoryVariables,
  type ListMyMediaAssetsVariables,
  type SoftDeleteMyStoryVariables,
} from '../../generated/dataconnect';

export interface FoundationDataConnectEmulator {
  host: string;
  port: number;
  sslEnabled?: boolean;
}

export interface FoundationSqlConnectOptions {
  /**
   * The Firebase app whose Auth session Data Connect should use. Supplying the
   * app keeps this module independent from the current Firestore bootstrap.
   */
  app: FirebaseApp;
  /** Explicit opt-in for isolated development and E2E clients only. */
  emulator?: FoundationDataConnectEmulator;
}

/**
 * Browser-only, phase-one access boundary for the generated Data Connect SDK.
 *
 * Importing this module does not initialize Firebase and does not change the
 * application's active persistence provider. A phase-two caller must provide
 * its FirebaseApp deliberately.
 */
export class FoundationSqlConnectClient {
  readonly dataConnect: DataConnect;

  constructor(options: FoundationSqlConnectOptions) {
    this.dataConnect = getDataConnect(options.app, connectorConfig);
    if (options.emulator) {
      connectDataConnectEmulator(
        this.dataConnect,
        options.emulator.host,
        options.emulator.port,
        options.emulator.sslEnabled ?? false,
      );
    }
  }

  upsertMyAccount() {
    return upsertMyAccount(this.dataConnect);
  }

  getMyAccount(options?: ExecuteQueryOptions) {
    return getMyAccount(this.dataConnect, options);
  }

  listMyStories(options?: ExecuteQueryOptions) {
    return listMyStories(this.dataConnect, options);
  }

  getMyStory(variables: GetMyStoryVariables, options?: ExecuteQueryOptions) {
    return getMyStory(this.dataConnect, variables, options);
  }

  createStoryWithFirstChapter(variables: CreateStoryWithFirstChapterVariables) {
    return createStoryWithFirstChapter(this.dataConnect, variables);
  }

  createMyChapter(variables: CreateMyChapterVariables) {
    return createMyChapter(this.dataConnect, variables);
  }

  getMyChapter(variables: GetMyChapterVariables, options?: ExecuteQueryOptions) {
    return getMyChapter(this.dataConnect, variables, options);
  }

  softDeleteMyStory(variables: SoftDeleteMyStoryVariables) {
    return softDeleteMyStory(this.dataConnect, variables);
  }

  listMyMediaAssets(
    variables?: ListMyMediaAssetsVariables,
    options?: ExecuteQueryOptions,
  ) {
    return listMyMediaAssets(this.dataConnect, variables, options);
  }

  getMyMediaAsset(
    variables: GetMyMediaAssetVariables,
    options?: ExecuteQueryOptions,
  ) {
    return getMyMediaAsset(this.dataConnect, variables, options);
  }

  close(): Promise<void> {
    return terminate(this.dataConnect);
  }
}

export function createFoundationSqlConnectClient(
  options: FoundationSqlConnectOptions,
): FoundationSqlConnectClient {
  return new FoundationSqlConnectClient(options);
}
