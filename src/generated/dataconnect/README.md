# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `celestial-library`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetMyAccount*](#getmyaccount)
  - [*ListMyFoundationProbes*](#listmyfoundationprobes)
  - [*GetMyFoundationProbe*](#getmyfoundationprobe)
  - [*ListMyStories*](#listmystories)
  - [*GetMyStory*](#getmystory)
  - [*GetMyChapter*](#getmychapter)
  - [*GetMyMediaAsset*](#getmymediaasset)
  - [*ListMyMediaAssets*](#listmymediaassets)
  - [*AdminGetOwnedMediaAsset*](#admingetownedmediaasset)
  - [*AdminGetOwnedStoryScope*](#admingetownedstoryscope)
  - [*AdminGetOwnedChapterScope*](#admingetownedchapterscope)
  - [*AdminGetOwnedEntityScope*](#admingetownedentityscope)
  - [*AdminGetOwnedGenerationJobScope*](#admingetownedgenerationjobscope)
  - [*AdminGetOwnedMediaReplacementScope*](#admingetownedmediareplacementscope)
  - [*AdminListStaleMediaUploads*](#adminliststalemediauploads)
  - [*AdminListMediaCleanupTasks*](#adminlistmediacleanuptasks)
  - [*AdminListMediaAssetsForStorageReport*](#adminlistmediaassetsforstoragereport)
  - [*ListMyStoryChanges*](#listmystorychanges)
  - [*GetMyCurrentMediaSlot*](#getmycurrentmediaslot)
  - [*ListMyMediaSlotHistory*](#listmymediaslothistory)
  - [*AdminListOwnedStories*](#adminlistownedstories)
  - [*AdminListOwnedStoryCoverSlots*](#adminlistownedstorycoverslots)
  - [*AdminListOwnedStoryChanges*](#adminlistownedstorychanges)
  - [*AdminGetPersistenceReceipt*](#admingetpersistencereceipt)
  - [*AdminGetOwnedStoryGraph*](#admingetownedstorygraph)
  - [*AdminGetOwnedChapterContentGraph*](#admingetownedchaptercontentgraph)
  - [*AdminListOwnedStorySeeds*](#adminlistownedstoryseeds)
  - [*AdminGetOwnedStorySeedGraph*](#admingetownedstoryseedgraph)
  - [*AdminGetUserProfileGraph*](#admingetuserprofilegraph)
  - [*AdminGetOwnedMediaSlot*](#admingetownedmediaslot)
  - [*AdminListOwnedMediaSlotHistory*](#adminlistownedmediaslothistory)
  - [*AdminGetMediaUploadReceipt*](#admingetmediauploadreceipt)
  - [*AdminGetOwnedStorageQuotaReservation*](#admingetownedstoragequotareservation)
  - [*AdminGetMediaDeletionIntent*](#admingetmediadeletionintent)
  - [*AdminListStoryDeletionMediaCandidates*](#adminliststorydeletionmediacandidates)
  - [*AdminListStoryDeletionJobs*](#adminliststorydeletionjobs)
  - [*AdminListExpiredStoryTombstones*](#adminlistexpiredstorytombstones)
  - [*AdminGetStorageUsageReport*](#admingetstorageusagereport)
  - [*AdminListOwnedGlossaryTerms*](#adminlistownedglossaryterms)
  - [*AdminGetImageQuotaConsumption*](#admingetimagequotaconsumption)
  - [*AdminGetOwnedPortraitAsset*](#admingetownedportraitasset)
  - [*AdminGetAdminOverview*](#admingetadminoverview)
- [**Mutations**](#mutations)
  - [*UpsertMyAccount*](#upsertmyaccount)
  - [*CreateFoundationProbe*](#createfoundationprobe)
  - [*DeleteMyFoundationProbe*](#deletemyfoundationprobe)
  - [*CreateStoryWithFirstChapter*](#createstorywithfirstchapter)
  - [*CreateMyChapter*](#createmychapter)
  - [*SoftDeleteMyStory*](#softdeletemystory)
  - [*AdminPurgeFoundationProbe*](#adminpurgefoundationprobe)
  - [*AdminPurgeFoundationStory*](#adminpurgefoundationstory)
  - [*AdminReserveMediaAsset*](#adminreservemediaasset)
  - [*AdminCommitMediaAssetReady*](#admincommitmediaassetready)
  - [*AdminCommitMediaAssetReplacement*](#admincommitmediaassetreplacement)
  - [*AdminMarkMediaAssetFailed*](#adminmarkmediaassetfailed)
  - [*AdminMarkMediaAssetPendingCleanup*](#adminmarkmediaassetpendingcleanup)
  - [*AdminRequestMediaAssetDeletion*](#adminrequestmediaassetdeletion)
  - [*AdminCompleteMediaCleanup*](#admincompletemediacleanup)
  - [*AdminFailMediaCleanup*](#adminfailmediacleanup)
  - [*AdminDeleteOwnedStory*](#admindeleteownedstory)
  - [*AdminClaimStoryDeletionJob*](#adminclaimstorydeletionjob)
  - [*AdminFailStoryDeletionJob*](#adminfailstorydeletionjob)
  - [*AdminAdvanceStoryDeletionJob*](#adminadvancestorydeletionjob)
  - [*AdminCompleteStoryDeletionJob*](#admincompletestorydeletionjob)
  - [*AdminPurgeExpiredStoryTombstone*](#adminpurgeexpiredstorytombstone)
  - [*AdminReserveStorageQuota*](#adminreservestoragequota)
  - [*AdminReleaseStorageQuotaReservation*](#adminreleasestoragequotareservation)
  - [*AdminReserveMediaAssetIdempotent*](#adminreservemediaassetidempotent)
  - [*AdminCommitMediaAssetToSlot*](#admincommitmediaassettoslot)
  - [*AdminSelectOwnedMediaSlotAsset*](#adminselectownedmediaslotasset)
  - [*AdminSelectUserPortrait*](#adminselectuserportrait)
  - [*AdminEnsureMediaDeletionIntent*](#adminensuremediadeletionintent)
  - [*AdminClaimMediaCleanupTask*](#adminclaimmediacleanuptask)
  - [*AdminCompleteMediaDeletionIntent*](#admincompletemediadeletionintent)
  - [*AdminFailMediaDeletionIntent*](#adminfailmediadeletionintent)
  - [*AdminDeleteOwnedStorySeed*](#admindeleteownedstoryseed)
  - [*AdminDeleteOwnedGlossaryTerm*](#admindeleteownedglossaryterm)
  - [*AdminConsumeImageGenerationQuota*](#adminconsumeimagegenerationquota)
  - [*AdminRecoverPendingUserPortraits*](#adminrecoverpendinguserportraits)
  - [*AdminUpdateAccountAccess*](#adminupdateaccountaccess)
  - [*AdminDeleteStoryAsAdmin*](#admindeletestoryasadmin)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `celestial-library`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@seihouse/celestial-library-dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@seihouse/celestial-library-dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@seihouse/celestial-library-dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `celestial-library` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetMyAccount
You can execute the `GetMyAccount` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMyAccount(options?: ExecuteQueryOptions): QueryPromise<GetMyAccountData, undefined>;

interface GetMyAccountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyAccountData, undefined>;
}
export const getMyAccountRef: GetMyAccountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyAccount(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyAccountData, undefined>;

interface GetMyAccountRef {
  ...
  (dc: DataConnect): QueryRef<GetMyAccountData, undefined>;
}
export const getMyAccountRef: GetMyAccountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyAccountRef:
```typescript
const name = getMyAccountRef.operationName;
console.log(name);
```

### Variables
The `GetMyAccount` query has no variables.
### Return Type
Recall that executing the `GetMyAccount` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyAccountData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyAccountData {
  userAccount?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: AccountRole;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserAccount_Key;
}
```
### Using `GetMyAccount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyAccount } from '@seihouse/celestial-library-dataconnect';


// Call the `getMyAccount()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyAccount();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyAccount(dataConnect);

console.log(data.userAccount);

// Or, you can use the `Promise` API.
getMyAccount().then((response) => {
  const data = response.data;
  console.log(data.userAccount);
});
```

### Using `GetMyAccount`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyAccountRef } from '@seihouse/celestial-library-dataconnect';


// Call the `getMyAccountRef()` function to get a reference to the query.
const ref = getMyAccountRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyAccountRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userAccount);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userAccount);
});
```

## ListMyFoundationProbes
You can execute the `ListMyFoundationProbes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyFoundationProbes(options?: ExecuteQueryOptions): QueryPromise<ListMyFoundationProbesData, undefined>;

interface ListMyFoundationProbesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyFoundationProbesData, undefined>;
}
export const listMyFoundationProbesRef: ListMyFoundationProbesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyFoundationProbes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyFoundationProbesData, undefined>;

interface ListMyFoundationProbesRef {
  ...
  (dc: DataConnect): QueryRef<ListMyFoundationProbesData, undefined>;
}
export const listMyFoundationProbesRef: ListMyFoundationProbesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyFoundationProbesRef:
```typescript
const name = listMyFoundationProbesRef.operationName;
console.log(name);
```

### Variables
The `ListMyFoundationProbes` query has no variables.
### Return Type
Recall that executing the `ListMyFoundationProbes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyFoundationProbesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyFoundationProbesData {
  foundationProbes: ({
    id: UUIDString;
    label: string;
    createdAt: TimestampString;
  } & FoundationProbe_Key)[];
}
```
### Using `ListMyFoundationProbes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyFoundationProbes } from '@seihouse/celestial-library-dataconnect';


// Call the `listMyFoundationProbes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyFoundationProbes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyFoundationProbes(dataConnect);

console.log(data.foundationProbes);

// Or, you can use the `Promise` API.
listMyFoundationProbes().then((response) => {
  const data = response.data;
  console.log(data.foundationProbes);
});
```

### Using `ListMyFoundationProbes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyFoundationProbesRef } from '@seihouse/celestial-library-dataconnect';


// Call the `listMyFoundationProbesRef()` function to get a reference to the query.
const ref = listMyFoundationProbesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyFoundationProbesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.foundationProbes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.foundationProbes);
});
```

## GetMyFoundationProbe
You can execute the `GetMyFoundationProbe` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMyFoundationProbe(vars: GetMyFoundationProbeVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;

interface GetMyFoundationProbeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyFoundationProbeVariables): QueryRef<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;
}
export const getMyFoundationProbeRef: GetMyFoundationProbeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyFoundationProbe(dc: DataConnect, vars: GetMyFoundationProbeVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;

interface GetMyFoundationProbeRef {
  ...
  (dc: DataConnect, vars: GetMyFoundationProbeVariables): QueryRef<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;
}
export const getMyFoundationProbeRef: GetMyFoundationProbeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyFoundationProbeRef:
```typescript
const name = getMyFoundationProbeRef.operationName;
console.log(name);
```

### Variables
The `GetMyFoundationProbe` query requires an argument of type `GetMyFoundationProbeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyFoundationProbeVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetMyFoundationProbe` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyFoundationProbeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyFoundationProbeData {
  foundationProbe?: {
    id: UUIDString;
    label: string;
    createdAt: TimestampString;
  } & FoundationProbe_Key;
}
```
### Using `GetMyFoundationProbe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyFoundationProbe, GetMyFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyFoundationProbe` query requires an argument of type `GetMyFoundationProbeVariables`:
const getMyFoundationProbeVars: GetMyFoundationProbeVariables = {
  id: ..., 
};

// Call the `getMyFoundationProbe()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyFoundationProbe(getMyFoundationProbeVars);
// Variables can be defined inline as well.
const { data } = await getMyFoundationProbe({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyFoundationProbe(dataConnect, getMyFoundationProbeVars);

console.log(data.foundationProbe);

// Or, you can use the `Promise` API.
getMyFoundationProbe(getMyFoundationProbeVars).then((response) => {
  const data = response.data;
  console.log(data.foundationProbe);
});
```

### Using `GetMyFoundationProbe`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyFoundationProbeRef, GetMyFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyFoundationProbe` query requires an argument of type `GetMyFoundationProbeVariables`:
const getMyFoundationProbeVars: GetMyFoundationProbeVariables = {
  id: ..., 
};

// Call the `getMyFoundationProbeRef()` function to get a reference to the query.
const ref = getMyFoundationProbeRef(getMyFoundationProbeVars);
// Variables can be defined inline as well.
const ref = getMyFoundationProbeRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyFoundationProbeRef(dataConnect, getMyFoundationProbeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.foundationProbe);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.foundationProbe);
});
```

## ListMyStories
You can execute the `ListMyStories` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyStories(options?: ExecuteQueryOptions): QueryPromise<ListMyStoriesData, undefined>;

interface ListMyStoriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyStoriesData, undefined>;
}
export const listMyStoriesRef: ListMyStoriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyStories(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyStoriesData, undefined>;

interface ListMyStoriesRef {
  ...
  (dc: DataConnect): QueryRef<ListMyStoriesData, undefined>;
}
export const listMyStoriesRef: ListMyStoriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyStoriesRef:
```typescript
const name = listMyStoriesRef.operationName;
console.log(name);
```

### Variables
The `ListMyStories` query has no variables.
### Return Type
Recall that executing the `ListMyStories` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyStoriesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyStoriesData {
  stories: ({
    id: UUIDString;
    legacyStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    syncRevision?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key)[];
}
```
### Using `ListMyStories`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyStories } from '@seihouse/celestial-library-dataconnect';


// Call the `listMyStories()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyStories();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyStories(dataConnect);

console.log(data.stories);

// Or, you can use the `Promise` API.
listMyStories().then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

### Using `ListMyStories`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyStoriesRef } from '@seihouse/celestial-library-dataconnect';


// Call the `listMyStoriesRef()` function to get a reference to the query.
const ref = listMyStoriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyStoriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.stories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

## GetMyStory
You can execute the `GetMyStory` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMyStory(vars: GetMyStoryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStoryData, GetMyStoryVariables>;

interface GetMyStoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyStoryVariables): QueryRef<GetMyStoryData, GetMyStoryVariables>;
}
export const getMyStoryRef: GetMyStoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyStory(dc: DataConnect, vars: GetMyStoryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStoryData, GetMyStoryVariables>;

interface GetMyStoryRef {
  ...
  (dc: DataConnect, vars: GetMyStoryVariables): QueryRef<GetMyStoryData, GetMyStoryVariables>;
}
export const getMyStoryRef: GetMyStoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyStoryRef:
```typescript
const name = getMyStoryRef.operationName;
console.log(name);
```

### Variables
The `GetMyStory` query requires an argument of type `GetMyStoryVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyStoryVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetMyStory` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyStoryData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyStoryData {
  story?: {
    id: UUIDString;
    legacyStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    syncRevision?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    arcs: ({
      id: UUIDString;
      arcNumber: number;
      title: string;
      summary?: string | null;
      status: ArcStatus;
    } & StoryArc_Key)[];
    chapters: ({
      id: UUIDString;
      chapterNumber: number;
      title: string;
      premise?: string | null;
      status: ChapterStatus;
      summary?: string | null;
      contentHash?: string | null;
      versionId?: string | null;
      isSealed: boolean;
      updatedAt: TimestampString;
    } & Chapter_Key)[];
  } & Story_Key;
}
```
### Using `GetMyStory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyStory, GetMyStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyStory` query requires an argument of type `GetMyStoryVariables`:
const getMyStoryVars: GetMyStoryVariables = {
  id: ..., 
};

// Call the `getMyStory()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyStory(getMyStoryVars);
// Variables can be defined inline as well.
const { data } = await getMyStory({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyStory(dataConnect, getMyStoryVars);

console.log(data.story);

// Or, you can use the `Promise` API.
getMyStory(getMyStoryVars).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

### Using `GetMyStory`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyStoryRef, GetMyStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyStory` query requires an argument of type `GetMyStoryVariables`:
const getMyStoryVars: GetMyStoryVariables = {
  id: ..., 
};

// Call the `getMyStoryRef()` function to get a reference to the query.
const ref = getMyStoryRef(getMyStoryVars);
// Variables can be defined inline as well.
const ref = getMyStoryRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyStoryRef(dataConnect, getMyStoryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.story);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

## GetMyChapter
You can execute the `GetMyChapter` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMyChapter(vars: GetMyChapterVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyChapterData, GetMyChapterVariables>;

interface GetMyChapterRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyChapterVariables): QueryRef<GetMyChapterData, GetMyChapterVariables>;
}
export const getMyChapterRef: GetMyChapterRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyChapter(dc: DataConnect, vars: GetMyChapterVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyChapterData, GetMyChapterVariables>;

interface GetMyChapterRef {
  ...
  (dc: DataConnect, vars: GetMyChapterVariables): QueryRef<GetMyChapterData, GetMyChapterVariables>;
}
export const getMyChapterRef: GetMyChapterRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyChapterRef:
```typescript
const name = getMyChapterRef.operationName;
console.log(name);
```

### Variables
The `GetMyChapter` query requires an argument of type `GetMyChapterVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyChapterVariables {
  storyId: UUIDString;
  chapterNumber: number;
}
```
### Return Type
Recall that executing the `GetMyChapter` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyChapterData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyChapterData {
  chapter?: {
    id: UUIDString;
    chapterNumber: number;
    title: string;
    premise?: string | null;
    status: ChapterStatus;
    summary?: string | null;
    contentHash?: string | null;
    versionId?: string | null;
    isSealed: boolean;
    content?: {
      generatedContent: string;
      statsChangeMessage?: string | null;
      contextEngine?: string | null;
      contractObjective?: string | null;
      contractRequiredOpening?: string | null;
      handoffNextImmediateAction?: string | null;
      handoffEndLocation?: string | null;
      handoffOpenTension?: string | null;
      revisionId?: string | null;
      syncRevision?: string | null;
      updatedAt: TimestampString;
    };
    blocks: ({
      id: UUIDString;
      legacyBlockId?: string | null;
      position: number;
      blockType: string;
      text: string;
      speakerName?: string | null;
      speakerRole?: string | null;
      sceneType?: string | null;
      environment?: string[] | null;
      atmosphereCategory?: string | null;
      atmosphereTags?: string[] | null;
      theme?: string[] | null;
      emotion?: string | null;
      intensity?: number | null;
    } & ChapterBlock_Key)[];
  } & Chapter_Key;
}
```
### Using `GetMyChapter`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyChapter, GetMyChapterVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyChapter` query requires an argument of type `GetMyChapterVariables`:
const getMyChapterVars: GetMyChapterVariables = {
  storyId: ..., 
  chapterNumber: ..., 
};

// Call the `getMyChapter()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyChapter(getMyChapterVars);
// Variables can be defined inline as well.
const { data } = await getMyChapter({ storyId: ..., chapterNumber: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyChapter(dataConnect, getMyChapterVars);

console.log(data.chapter);

// Or, you can use the `Promise` API.
getMyChapter(getMyChapterVars).then((response) => {
  const data = response.data;
  console.log(data.chapter);
});
```

### Using `GetMyChapter`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyChapterRef, GetMyChapterVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyChapter` query requires an argument of type `GetMyChapterVariables`:
const getMyChapterVars: GetMyChapterVariables = {
  storyId: ..., 
  chapterNumber: ..., 
};

// Call the `getMyChapterRef()` function to get a reference to the query.
const ref = getMyChapterRef(getMyChapterVars);
// Variables can be defined inline as well.
const ref = getMyChapterRef({ storyId: ..., chapterNumber: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyChapterRef(dataConnect, getMyChapterVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chapter);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chapter);
});
```

## GetMyMediaAsset
You can execute the `GetMyMediaAsset` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMyMediaAsset(vars: GetMyMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyMediaAssetData, GetMyMediaAssetVariables>;

interface GetMyMediaAssetRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyMediaAssetVariables): QueryRef<GetMyMediaAssetData, GetMyMediaAssetVariables>;
}
export const getMyMediaAssetRef: GetMyMediaAssetRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyMediaAsset(dc: DataConnect, vars: GetMyMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyMediaAssetData, GetMyMediaAssetVariables>;

interface GetMyMediaAssetRef {
  ...
  (dc: DataConnect, vars: GetMyMediaAssetVariables): QueryRef<GetMyMediaAssetData, GetMyMediaAssetVariables>;
}
export const getMyMediaAssetRef: GetMyMediaAssetRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyMediaAssetRef:
```typescript
const name = getMyMediaAssetRef.operationName;
console.log(name);
```

### Variables
The `GetMyMediaAsset` query requires an argument of type `GetMyMediaAssetVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyMediaAssetVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetMyMediaAsset` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyMediaAssetData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyMediaAssetData {
  mediaAsset?: {
    id: UUIDString;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    version: number;
    cacheControl: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    readyAt?: TimestampString | null;
  } & MediaAsset_Key;
}
```
### Using `GetMyMediaAsset`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyMediaAsset, GetMyMediaAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyMediaAsset` query requires an argument of type `GetMyMediaAssetVariables`:
const getMyMediaAssetVars: GetMyMediaAssetVariables = {
  id: ..., 
};

// Call the `getMyMediaAsset()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyMediaAsset(getMyMediaAssetVars);
// Variables can be defined inline as well.
const { data } = await getMyMediaAsset({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyMediaAsset(dataConnect, getMyMediaAssetVars);

console.log(data.mediaAsset);

// Or, you can use the `Promise` API.
getMyMediaAsset(getMyMediaAssetVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset);
});
```

### Using `GetMyMediaAsset`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyMediaAssetRef, GetMyMediaAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyMediaAsset` query requires an argument of type `GetMyMediaAssetVariables`:
const getMyMediaAssetVars: GetMyMediaAssetVariables = {
  id: ..., 
};

// Call the `getMyMediaAssetRef()` function to get a reference to the query.
const ref = getMyMediaAssetRef(getMyMediaAssetVars);
// Variables can be defined inline as well.
const ref = getMyMediaAssetRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyMediaAssetRef(dataConnect, getMyMediaAssetVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAsset);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset);
});
```

## ListMyMediaAssets
You can execute the `ListMyMediaAssets` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyMediaAssets(vars?: ListMyMediaAssetsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;

interface ListMyMediaAssetsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListMyMediaAssetsVariables): QueryRef<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;
}
export const listMyMediaAssetsRef: ListMyMediaAssetsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyMediaAssets(dc: DataConnect, vars?: ListMyMediaAssetsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;

interface ListMyMediaAssetsRef {
  ...
  (dc: DataConnect, vars?: ListMyMediaAssetsVariables): QueryRef<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;
}
export const listMyMediaAssetsRef: ListMyMediaAssetsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyMediaAssetsRef:
```typescript
const name = listMyMediaAssetsRef.operationName;
console.log(name);
```

### Variables
The `ListMyMediaAssets` query has an optional argument of type `ListMyMediaAssetsVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMyMediaAssetsVariables {
  storyId?: UUIDString | null;
  status?: MediaAssetStatus | null;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `ListMyMediaAssets` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyMediaAssetsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyMediaAssetsData {
  mediaAssets: ({
    id: UUIDString;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    mimeType: string;
    byteSize: Int64String;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    createdAt: TimestampString;
    readyAt?: TimestampString | null;
    cleanupAfter?: TimestampString | null;
  } & MediaAsset_Key)[];
}
```
### Using `ListMyMediaAssets`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyMediaAssets, ListMyMediaAssetsVariables } from '@seihouse/celestial-library-dataconnect';

// The `ListMyMediaAssets` query has an optional argument of type `ListMyMediaAssetsVariables`:
const listMyMediaAssetsVars: ListMyMediaAssetsVariables = {
  storyId: ..., // optional
  status: ..., // optional
  limit: ..., // optional
};

// Call the `listMyMediaAssets()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyMediaAssets(listMyMediaAssetsVars);
// Variables can be defined inline as well.
const { data } = await listMyMediaAssets({ storyId: ..., status: ..., limit: ..., });
// Since all variables are optional for this query, you can omit the `ListMyMediaAssetsVariables` argument.
const { data } = await listMyMediaAssets();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyMediaAssets(dataConnect, listMyMediaAssetsVars);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
listMyMediaAssets(listMyMediaAssetsVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

### Using `ListMyMediaAssets`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyMediaAssetsRef, ListMyMediaAssetsVariables } from '@seihouse/celestial-library-dataconnect';

// The `ListMyMediaAssets` query has an optional argument of type `ListMyMediaAssetsVariables`:
const listMyMediaAssetsVars: ListMyMediaAssetsVariables = {
  storyId: ..., // optional
  status: ..., // optional
  limit: ..., // optional
};

// Call the `listMyMediaAssetsRef()` function to get a reference to the query.
const ref = listMyMediaAssetsRef(listMyMediaAssetsVars);
// Variables can be defined inline as well.
const ref = listMyMediaAssetsRef({ storyId: ..., status: ..., limit: ..., });
// Since all variables are optional for this query, you can omit the `ListMyMediaAssetsVariables` argument.
const ref = listMyMediaAssetsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyMediaAssetsRef(dataConnect, listMyMediaAssetsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

## AdminGetOwnedMediaAsset
You can execute the `AdminGetOwnedMediaAsset` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedMediaAsset(vars: AdminGetOwnedMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;

interface AdminGetOwnedMediaAssetRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedMediaAssetVariables): QueryRef<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;
}
export const adminGetOwnedMediaAssetRef: AdminGetOwnedMediaAssetRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedMediaAsset(dc: DataConnect, vars: AdminGetOwnedMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;

interface AdminGetOwnedMediaAssetRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedMediaAssetVariables): QueryRef<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;
}
export const adminGetOwnedMediaAssetRef: AdminGetOwnedMediaAssetRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedMediaAssetRef:
```typescript
const name = adminGetOwnedMediaAssetRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedMediaAsset` query requires an argument of type `AdminGetOwnedMediaAssetVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedMediaAssetVariables {
  ownerUid: string;
  id: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedMediaAsset` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedMediaAssetData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedMediaAssetData {
  mediaAsset?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    generationJobId?: UUIDString | null;
    replacesAssetId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    version: number;
    cacheControl: string;
    failureCode?: string | null;
    failureMessage?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    readyAt?: TimestampString | null;
    archivedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    cleanupAfter?: TimestampString | null;
  } & MediaAsset_Key;
}
```
### Using `AdminGetOwnedMediaAsset`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedMediaAsset, AdminGetOwnedMediaAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedMediaAsset` query requires an argument of type `AdminGetOwnedMediaAssetVariables`:
const adminGetOwnedMediaAssetVars: AdminGetOwnedMediaAssetVariables = {
  ownerUid: ..., 
  id: ..., 
};

// Call the `adminGetOwnedMediaAsset()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedMediaAsset(adminGetOwnedMediaAssetVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedMediaAsset({ ownerUid: ..., id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedMediaAsset(dataConnect, adminGetOwnedMediaAssetVars);

console.log(data.mediaAsset);

// Or, you can use the `Promise` API.
adminGetOwnedMediaAsset(adminGetOwnedMediaAssetVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset);
});
```

### Using `AdminGetOwnedMediaAsset`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedMediaAssetRef, AdminGetOwnedMediaAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedMediaAsset` query requires an argument of type `AdminGetOwnedMediaAssetVariables`:
const adminGetOwnedMediaAssetVars: AdminGetOwnedMediaAssetVariables = {
  ownerUid: ..., 
  id: ..., 
};

// Call the `adminGetOwnedMediaAssetRef()` function to get a reference to the query.
const ref = adminGetOwnedMediaAssetRef(adminGetOwnedMediaAssetVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedMediaAssetRef({ ownerUid: ..., id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedMediaAssetRef(dataConnect, adminGetOwnedMediaAssetVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAsset);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset);
});
```

## AdminGetOwnedStoryScope
You can execute the `AdminGetOwnedStoryScope` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedStoryScope(vars: AdminGetOwnedStoryScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;

interface AdminGetOwnedStoryScopeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStoryScopeVariables): QueryRef<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;
}
export const adminGetOwnedStoryScopeRef: AdminGetOwnedStoryScopeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedStoryScope(dc: DataConnect, vars: AdminGetOwnedStoryScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;

interface AdminGetOwnedStoryScopeRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedStoryScopeVariables): QueryRef<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;
}
export const adminGetOwnedStoryScopeRef: AdminGetOwnedStoryScopeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedStoryScopeRef:
```typescript
const name = adminGetOwnedStoryScopeRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedStoryScope` query requires an argument of type `AdminGetOwnedStoryScopeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedStoryScopeVariables {
  ownerUid: string;
  storyId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedStoryScope` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedStoryScopeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedStoryScopeData {
  story?: {
    id: UUIDString;
    ownerUid: string;
  } & Story_Key;
}
```
### Using `AdminGetOwnedStoryScope`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStoryScope, AdminGetOwnedStoryScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStoryScope` query requires an argument of type `AdminGetOwnedStoryScopeVariables`:
const adminGetOwnedStoryScopeVars: AdminGetOwnedStoryScopeVariables = {
  ownerUid: ..., 
  storyId: ..., 
};

// Call the `adminGetOwnedStoryScope()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedStoryScope(adminGetOwnedStoryScopeVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedStoryScope({ ownerUid: ..., storyId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedStoryScope(dataConnect, adminGetOwnedStoryScopeVars);

console.log(data.story);

// Or, you can use the `Promise` API.
adminGetOwnedStoryScope(adminGetOwnedStoryScopeVars).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

### Using `AdminGetOwnedStoryScope`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStoryScopeRef, AdminGetOwnedStoryScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStoryScope` query requires an argument of type `AdminGetOwnedStoryScopeVariables`:
const adminGetOwnedStoryScopeVars: AdminGetOwnedStoryScopeVariables = {
  ownerUid: ..., 
  storyId: ..., 
};

// Call the `adminGetOwnedStoryScopeRef()` function to get a reference to the query.
const ref = adminGetOwnedStoryScopeRef(adminGetOwnedStoryScopeVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedStoryScopeRef({ ownerUid: ..., storyId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedStoryScopeRef(dataConnect, adminGetOwnedStoryScopeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.story);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

## AdminGetOwnedChapterScope
You can execute the `AdminGetOwnedChapterScope` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedChapterScope(vars: AdminGetOwnedChapterScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;

interface AdminGetOwnedChapterScopeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedChapterScopeVariables): QueryRef<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;
}
export const adminGetOwnedChapterScopeRef: AdminGetOwnedChapterScopeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedChapterScope(dc: DataConnect, vars: AdminGetOwnedChapterScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;

interface AdminGetOwnedChapterScopeRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedChapterScopeVariables): QueryRef<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;
}
export const adminGetOwnedChapterScopeRef: AdminGetOwnedChapterScopeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedChapterScopeRef:
```typescript
const name = adminGetOwnedChapterScopeRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedChapterScope` query requires an argument of type `AdminGetOwnedChapterScopeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedChapterScopeVariables {
  ownerUid: string;
  chapterId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedChapterScope` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedChapterScopeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedChapterScopeData {
  chapter?: {
    id: UUIDString;
    storyId: UUIDString;
  } & Chapter_Key;
}
```
### Using `AdminGetOwnedChapterScope`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedChapterScope, AdminGetOwnedChapterScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedChapterScope` query requires an argument of type `AdminGetOwnedChapterScopeVariables`:
const adminGetOwnedChapterScopeVars: AdminGetOwnedChapterScopeVariables = {
  ownerUid: ..., 
  chapterId: ..., 
};

// Call the `adminGetOwnedChapterScope()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedChapterScope(adminGetOwnedChapterScopeVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedChapterScope({ ownerUid: ..., chapterId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedChapterScope(dataConnect, adminGetOwnedChapterScopeVars);

console.log(data.chapter);

// Or, you can use the `Promise` API.
adminGetOwnedChapterScope(adminGetOwnedChapterScopeVars).then((response) => {
  const data = response.data;
  console.log(data.chapter);
});
```

### Using `AdminGetOwnedChapterScope`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedChapterScopeRef, AdminGetOwnedChapterScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedChapterScope` query requires an argument of type `AdminGetOwnedChapterScopeVariables`:
const adminGetOwnedChapterScopeVars: AdminGetOwnedChapterScopeVariables = {
  ownerUid: ..., 
  chapterId: ..., 
};

// Call the `adminGetOwnedChapterScopeRef()` function to get a reference to the query.
const ref = adminGetOwnedChapterScopeRef(adminGetOwnedChapterScopeVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedChapterScopeRef({ ownerUid: ..., chapterId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedChapterScopeRef(dataConnect, adminGetOwnedChapterScopeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chapter);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chapter);
});
```

## AdminGetOwnedEntityScope
You can execute the `AdminGetOwnedEntityScope` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedEntityScope(vars: AdminGetOwnedEntityScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;

interface AdminGetOwnedEntityScopeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedEntityScopeVariables): QueryRef<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;
}
export const adminGetOwnedEntityScopeRef: AdminGetOwnedEntityScopeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedEntityScope(dc: DataConnect, vars: AdminGetOwnedEntityScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;

interface AdminGetOwnedEntityScopeRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedEntityScopeVariables): QueryRef<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;
}
export const adminGetOwnedEntityScopeRef: AdminGetOwnedEntityScopeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedEntityScopeRef:
```typescript
const name = adminGetOwnedEntityScopeRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedEntityScope` query requires an argument of type `AdminGetOwnedEntityScopeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedEntityScopeVariables {
  ownerUid: string;
  entityId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedEntityScope` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedEntityScopeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedEntityScopeData {
  codexEntity?: {
    id: UUIDString;
    storyId: UUIDString;
  } & CodexEntity_Key;
}
```
### Using `AdminGetOwnedEntityScope`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedEntityScope, AdminGetOwnedEntityScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedEntityScope` query requires an argument of type `AdminGetOwnedEntityScopeVariables`:
const adminGetOwnedEntityScopeVars: AdminGetOwnedEntityScopeVariables = {
  ownerUid: ..., 
  entityId: ..., 
};

// Call the `adminGetOwnedEntityScope()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedEntityScope(adminGetOwnedEntityScopeVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedEntityScope({ ownerUid: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedEntityScope(dataConnect, adminGetOwnedEntityScopeVars);

console.log(data.codexEntity);

// Or, you can use the `Promise` API.
adminGetOwnedEntityScope(adminGetOwnedEntityScopeVars).then((response) => {
  const data = response.data;
  console.log(data.codexEntity);
});
```

### Using `AdminGetOwnedEntityScope`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedEntityScopeRef, AdminGetOwnedEntityScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedEntityScope` query requires an argument of type `AdminGetOwnedEntityScopeVariables`:
const adminGetOwnedEntityScopeVars: AdminGetOwnedEntityScopeVariables = {
  ownerUid: ..., 
  entityId: ..., 
};

// Call the `adminGetOwnedEntityScopeRef()` function to get a reference to the query.
const ref = adminGetOwnedEntityScopeRef(adminGetOwnedEntityScopeVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedEntityScopeRef({ ownerUid: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedEntityScopeRef(dataConnect, adminGetOwnedEntityScopeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.codexEntity);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.codexEntity);
});
```

## AdminGetOwnedGenerationJobScope
You can execute the `AdminGetOwnedGenerationJobScope` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedGenerationJobScope(vars: AdminGetOwnedGenerationJobScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;

interface AdminGetOwnedGenerationJobScopeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedGenerationJobScopeVariables): QueryRef<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;
}
export const adminGetOwnedGenerationJobScopeRef: AdminGetOwnedGenerationJobScopeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedGenerationJobScope(dc: DataConnect, vars: AdminGetOwnedGenerationJobScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;

interface AdminGetOwnedGenerationJobScopeRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedGenerationJobScopeVariables): QueryRef<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;
}
export const adminGetOwnedGenerationJobScopeRef: AdminGetOwnedGenerationJobScopeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedGenerationJobScopeRef:
```typescript
const name = adminGetOwnedGenerationJobScopeRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedGenerationJobScope` query requires an argument of type `AdminGetOwnedGenerationJobScopeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedGenerationJobScopeVariables {
  ownerUid: string;
  generationJobId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedGenerationJobScope` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedGenerationJobScopeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedGenerationJobScopeData {
  generationJob?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
  } & GenerationJob_Key;
}
```
### Using `AdminGetOwnedGenerationJobScope`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedGenerationJobScope, AdminGetOwnedGenerationJobScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedGenerationJobScope` query requires an argument of type `AdminGetOwnedGenerationJobScopeVariables`:
const adminGetOwnedGenerationJobScopeVars: AdminGetOwnedGenerationJobScopeVariables = {
  ownerUid: ..., 
  generationJobId: ..., 
};

// Call the `adminGetOwnedGenerationJobScope()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedGenerationJobScope(adminGetOwnedGenerationJobScopeVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedGenerationJobScope({ ownerUid: ..., generationJobId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedGenerationJobScope(dataConnect, adminGetOwnedGenerationJobScopeVars);

console.log(data.generationJob);

// Or, you can use the `Promise` API.
adminGetOwnedGenerationJobScope(adminGetOwnedGenerationJobScopeVars).then((response) => {
  const data = response.data;
  console.log(data.generationJob);
});
```

### Using `AdminGetOwnedGenerationJobScope`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedGenerationJobScopeRef, AdminGetOwnedGenerationJobScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedGenerationJobScope` query requires an argument of type `AdminGetOwnedGenerationJobScopeVariables`:
const adminGetOwnedGenerationJobScopeVars: AdminGetOwnedGenerationJobScopeVariables = {
  ownerUid: ..., 
  generationJobId: ..., 
};

// Call the `adminGetOwnedGenerationJobScopeRef()` function to get a reference to the query.
const ref = adminGetOwnedGenerationJobScopeRef(adminGetOwnedGenerationJobScopeVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedGenerationJobScopeRef({ ownerUid: ..., generationJobId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedGenerationJobScopeRef(dataConnect, adminGetOwnedGenerationJobScopeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.generationJob);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.generationJob);
});
```

## AdminGetOwnedMediaReplacementScope
You can execute the `AdminGetOwnedMediaReplacementScope` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedMediaReplacementScope(vars: AdminGetOwnedMediaReplacementScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;

interface AdminGetOwnedMediaReplacementScopeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedMediaReplacementScopeVariables): QueryRef<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;
}
export const adminGetOwnedMediaReplacementScopeRef: AdminGetOwnedMediaReplacementScopeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedMediaReplacementScope(dc: DataConnect, vars: AdminGetOwnedMediaReplacementScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;

interface AdminGetOwnedMediaReplacementScopeRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedMediaReplacementScopeVariables): QueryRef<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;
}
export const adminGetOwnedMediaReplacementScopeRef: AdminGetOwnedMediaReplacementScopeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedMediaReplacementScopeRef:
```typescript
const name = adminGetOwnedMediaReplacementScopeRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedMediaReplacementScope` query requires an argument of type `AdminGetOwnedMediaReplacementScopeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedMediaReplacementScopeVariables {
  ownerUid: string;
  assetId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedMediaReplacementScope` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedMediaReplacementScopeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedMediaReplacementScopeData {
  mediaAsset?: {
    id: UUIDString;
    currentAttachments: ({
      targetKind: string;
      targetKey: string;
      purpose: string;
      storyId?: UUIDString | null;
      chapterId?: UUIDString | null;
      entityId?: UUIDString | null;
    })[];
  } & MediaAsset_Key;
}
```
### Using `AdminGetOwnedMediaReplacementScope`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedMediaReplacementScope, AdminGetOwnedMediaReplacementScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedMediaReplacementScope` query requires an argument of type `AdminGetOwnedMediaReplacementScopeVariables`:
const adminGetOwnedMediaReplacementScopeVars: AdminGetOwnedMediaReplacementScopeVariables = {
  ownerUid: ..., 
  assetId: ..., 
};

// Call the `adminGetOwnedMediaReplacementScope()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedMediaReplacementScope(adminGetOwnedMediaReplacementScopeVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedMediaReplacementScope({ ownerUid: ..., assetId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedMediaReplacementScope(dataConnect, adminGetOwnedMediaReplacementScopeVars);

console.log(data.mediaAsset);

// Or, you can use the `Promise` API.
adminGetOwnedMediaReplacementScope(adminGetOwnedMediaReplacementScopeVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset);
});
```

### Using `AdminGetOwnedMediaReplacementScope`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedMediaReplacementScopeRef, AdminGetOwnedMediaReplacementScopeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedMediaReplacementScope` query requires an argument of type `AdminGetOwnedMediaReplacementScopeVariables`:
const adminGetOwnedMediaReplacementScopeVars: AdminGetOwnedMediaReplacementScopeVariables = {
  ownerUid: ..., 
  assetId: ..., 
};

// Call the `adminGetOwnedMediaReplacementScopeRef()` function to get a reference to the query.
const ref = adminGetOwnedMediaReplacementScopeRef(adminGetOwnedMediaReplacementScopeVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedMediaReplacementScopeRef({ ownerUid: ..., assetId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedMediaReplacementScopeRef(dataConnect, adminGetOwnedMediaReplacementScopeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAsset);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset);
});
```

## AdminListStaleMediaUploads
You can execute the `AdminListStaleMediaUploads` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListStaleMediaUploads(vars: AdminListStaleMediaUploadsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;

interface AdminListStaleMediaUploadsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListStaleMediaUploadsVariables): QueryRef<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;
}
export const adminListStaleMediaUploadsRef: AdminListStaleMediaUploadsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListStaleMediaUploads(dc: DataConnect, vars: AdminListStaleMediaUploadsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;

interface AdminListStaleMediaUploadsRef {
  ...
  (dc: DataConnect, vars: AdminListStaleMediaUploadsVariables): QueryRef<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;
}
export const adminListStaleMediaUploadsRef: AdminListStaleMediaUploadsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListStaleMediaUploadsRef:
```typescript
const name = adminListStaleMediaUploadsRef.operationName;
console.log(name);
```

### Variables
The `AdminListStaleMediaUploads` query requires an argument of type `AdminListStaleMediaUploadsVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListStaleMediaUploadsVariables {
  staleBefore: TimestampString;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListStaleMediaUploads` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListStaleMediaUploadsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListStaleMediaUploadsData {
  mediaAssets: ({
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    generationJobId?: UUIDString | null;
    replacesAssetId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    version: number;
    cacheControl: string;
    failureCode?: string | null;
    failureMessage?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    readyAt?: TimestampString | null;
    archivedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    cleanupAfter?: TimestampString | null;
  } & MediaAsset_Key)[];
}
```
### Using `AdminListStaleMediaUploads`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListStaleMediaUploads, AdminListStaleMediaUploadsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListStaleMediaUploads` query requires an argument of type `AdminListStaleMediaUploadsVariables`:
const adminListStaleMediaUploadsVars: AdminListStaleMediaUploadsVariables = {
  staleBefore: ..., 
  limit: ..., // optional
};

// Call the `adminListStaleMediaUploads()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListStaleMediaUploads(adminListStaleMediaUploadsVars);
// Variables can be defined inline as well.
const { data } = await adminListStaleMediaUploads({ staleBefore: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListStaleMediaUploads(dataConnect, adminListStaleMediaUploadsVars);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
adminListStaleMediaUploads(adminListStaleMediaUploadsVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

### Using `AdminListStaleMediaUploads`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListStaleMediaUploadsRef, AdminListStaleMediaUploadsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListStaleMediaUploads` query requires an argument of type `AdminListStaleMediaUploadsVariables`:
const adminListStaleMediaUploadsVars: AdminListStaleMediaUploadsVariables = {
  staleBefore: ..., 
  limit: ..., // optional
};

// Call the `adminListStaleMediaUploadsRef()` function to get a reference to the query.
const ref = adminListStaleMediaUploadsRef(adminListStaleMediaUploadsVars);
// Variables can be defined inline as well.
const ref = adminListStaleMediaUploadsRef({ staleBefore: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListStaleMediaUploadsRef(dataConnect, adminListStaleMediaUploadsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

## AdminListMediaCleanupTasks
You can execute the `AdminListMediaCleanupTasks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListMediaCleanupTasks(vars?: AdminListMediaCleanupTasksVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;

interface AdminListMediaCleanupTasksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: AdminListMediaCleanupTasksVariables): QueryRef<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;
}
export const adminListMediaCleanupTasksRef: AdminListMediaCleanupTasksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListMediaCleanupTasks(dc: DataConnect, vars?: AdminListMediaCleanupTasksVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;

interface AdminListMediaCleanupTasksRef {
  ...
  (dc: DataConnect, vars?: AdminListMediaCleanupTasksVariables): QueryRef<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;
}
export const adminListMediaCleanupTasksRef: AdminListMediaCleanupTasksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListMediaCleanupTasksRef:
```typescript
const name = adminListMediaCleanupTasksRef.operationName;
console.log(name);
```

### Variables
The `AdminListMediaCleanupTasks` query has an optional argument of type `AdminListMediaCleanupTasksVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListMediaCleanupTasksVariables {
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListMediaCleanupTasks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListMediaCleanupTasksData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListMediaCleanupTasksData {
  mediaCleanupTasks: ({
    id: UUIDString;
    assetId: UUIDString;
    ownerUid: string;
    bucket: string;
    objectKey: string;
    reason: string;
    idempotencyKey?: string | null;
    status: MediaCleanupStatus;
    attemptCount: number;
    lastError?: string | null;
    nextAttemptAt: TimestampString;
    leaseOwner?: string | null;
    leaseExpiresAt?: TimestampString | null;
    createdAt: TimestampString;
  } & MediaCleanupTask_Key)[];
}
```
### Using `AdminListMediaCleanupTasks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListMediaCleanupTasks, AdminListMediaCleanupTasksVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListMediaCleanupTasks` query has an optional argument of type `AdminListMediaCleanupTasksVariables`:
const adminListMediaCleanupTasksVars: AdminListMediaCleanupTasksVariables = {
  limit: ..., // optional
};

// Call the `adminListMediaCleanupTasks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListMediaCleanupTasks(adminListMediaCleanupTasksVars);
// Variables can be defined inline as well.
const { data } = await adminListMediaCleanupTasks({ limit: ..., });
// Since all variables are optional for this query, you can omit the `AdminListMediaCleanupTasksVariables` argument.
const { data } = await adminListMediaCleanupTasks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListMediaCleanupTasks(dataConnect, adminListMediaCleanupTasksVars);

console.log(data.mediaCleanupTasks);

// Or, you can use the `Promise` API.
adminListMediaCleanupTasks(adminListMediaCleanupTasksVars).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTasks);
});
```

### Using `AdminListMediaCleanupTasks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListMediaCleanupTasksRef, AdminListMediaCleanupTasksVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListMediaCleanupTasks` query has an optional argument of type `AdminListMediaCleanupTasksVariables`:
const adminListMediaCleanupTasksVars: AdminListMediaCleanupTasksVariables = {
  limit: ..., // optional
};

// Call the `adminListMediaCleanupTasksRef()` function to get a reference to the query.
const ref = adminListMediaCleanupTasksRef(adminListMediaCleanupTasksVars);
// Variables can be defined inline as well.
const ref = adminListMediaCleanupTasksRef({ limit: ..., });
// Since all variables are optional for this query, you can omit the `AdminListMediaCleanupTasksVariables` argument.
const ref = adminListMediaCleanupTasksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListMediaCleanupTasksRef(dataConnect, adminListMediaCleanupTasksVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaCleanupTasks);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTasks);
});
```

## AdminListMediaAssetsForStorageReport
You can execute the `AdminListMediaAssetsForStorageReport` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListMediaAssetsForStorageReport(vars?: AdminListMediaAssetsForStorageReportVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;

interface AdminListMediaAssetsForStorageReportRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: AdminListMediaAssetsForStorageReportVariables): QueryRef<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;
}
export const adminListMediaAssetsForStorageReportRef: AdminListMediaAssetsForStorageReportRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListMediaAssetsForStorageReport(dc: DataConnect, vars?: AdminListMediaAssetsForStorageReportVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;

interface AdminListMediaAssetsForStorageReportRef {
  ...
  (dc: DataConnect, vars?: AdminListMediaAssetsForStorageReportVariables): QueryRef<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;
}
export const adminListMediaAssetsForStorageReportRef: AdminListMediaAssetsForStorageReportRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListMediaAssetsForStorageReportRef:
```typescript
const name = adminListMediaAssetsForStorageReportRef.operationName;
console.log(name);
```

### Variables
The `AdminListMediaAssetsForStorageReport` query has an optional argument of type `AdminListMediaAssetsForStorageReportVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListMediaAssetsForStorageReportVariables {
  limit?: number | null;
  offset?: number | null;
}
```
### Return Type
Recall that executing the `AdminListMediaAssetsForStorageReport` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListMediaAssetsForStorageReportData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListMediaAssetsForStorageReportData {
  mediaAssets: ({
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    status: MediaAssetStatus;
    byteSize: Int64String;
    mimeType: string;
    objectKey: string;
    createdAt: TimestampString;
  } & MediaAsset_Key)[];
}
```
### Using `AdminListMediaAssetsForStorageReport`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListMediaAssetsForStorageReport, AdminListMediaAssetsForStorageReportVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListMediaAssetsForStorageReport` query has an optional argument of type `AdminListMediaAssetsForStorageReportVariables`:
const adminListMediaAssetsForStorageReportVars: AdminListMediaAssetsForStorageReportVariables = {
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListMediaAssetsForStorageReport()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListMediaAssetsForStorageReport(adminListMediaAssetsForStorageReportVars);
// Variables can be defined inline as well.
const { data } = await adminListMediaAssetsForStorageReport({ limit: ..., offset: ..., });
// Since all variables are optional for this query, you can omit the `AdminListMediaAssetsForStorageReportVariables` argument.
const { data } = await adminListMediaAssetsForStorageReport();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListMediaAssetsForStorageReport(dataConnect, adminListMediaAssetsForStorageReportVars);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
adminListMediaAssetsForStorageReport(adminListMediaAssetsForStorageReportVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

### Using `AdminListMediaAssetsForStorageReport`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListMediaAssetsForStorageReportRef, AdminListMediaAssetsForStorageReportVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListMediaAssetsForStorageReport` query has an optional argument of type `AdminListMediaAssetsForStorageReportVariables`:
const adminListMediaAssetsForStorageReportVars: AdminListMediaAssetsForStorageReportVariables = {
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListMediaAssetsForStorageReportRef()` function to get a reference to the query.
const ref = adminListMediaAssetsForStorageReportRef(adminListMediaAssetsForStorageReportVars);
// Variables can be defined inline as well.
const ref = adminListMediaAssetsForStorageReportRef({ limit: ..., offset: ..., });
// Since all variables are optional for this query, you can omit the `AdminListMediaAssetsForStorageReportVariables` argument.
const ref = adminListMediaAssetsForStorageReportRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListMediaAssetsForStorageReportRef(dataConnect, adminListMediaAssetsForStorageReportVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

## ListMyStoryChanges
You can execute the `ListMyStoryChanges` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyStoryChanges(vars: ListMyStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyStoryChangesData, ListMyStoryChangesVariables>;

interface ListMyStoryChangesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMyStoryChangesVariables): QueryRef<ListMyStoryChangesData, ListMyStoryChangesVariables>;
}
export const listMyStoryChangesRef: ListMyStoryChangesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyStoryChanges(dc: DataConnect, vars: ListMyStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyStoryChangesData, ListMyStoryChangesVariables>;

interface ListMyStoryChangesRef {
  ...
  (dc: DataConnect, vars: ListMyStoryChangesVariables): QueryRef<ListMyStoryChangesData, ListMyStoryChangesVariables>;
}
export const listMyStoryChangesRef: ListMyStoryChangesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyStoryChangesRef:
```typescript
const name = listMyStoryChangesRef.operationName;
console.log(name);
```

### Variables
The `ListMyStoryChanges` query requires an argument of type `ListMyStoryChangesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMyStoryChangesVariables {
  changedAfter: TimestampString;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `ListMyStoryChanges` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyStoryChangesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyStoryChangesData {
  storyChanges: ({
    id: UUIDString;
    storyId: UUIDString;
    changeKind: StoryChangeKind;
    storyRevision: Int64String;
    syncRevision: string;
    idempotencyKey: string;
    changedAt: TimestampString;
  } & StoryChange_Key)[];
}
```
### Using `ListMyStoryChanges`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyStoryChanges, ListMyStoryChangesVariables } from '@seihouse/celestial-library-dataconnect';

// The `ListMyStoryChanges` query requires an argument of type `ListMyStoryChangesVariables`:
const listMyStoryChangesVars: ListMyStoryChangesVariables = {
  changedAfter: ..., 
  limit: ..., // optional
};

// Call the `listMyStoryChanges()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyStoryChanges(listMyStoryChangesVars);
// Variables can be defined inline as well.
const { data } = await listMyStoryChanges({ changedAfter: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyStoryChanges(dataConnect, listMyStoryChangesVars);

console.log(data.storyChanges);

// Or, you can use the `Promise` API.
listMyStoryChanges(listMyStoryChangesVars).then((response) => {
  const data = response.data;
  console.log(data.storyChanges);
});
```

### Using `ListMyStoryChanges`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyStoryChangesRef, ListMyStoryChangesVariables } from '@seihouse/celestial-library-dataconnect';

// The `ListMyStoryChanges` query requires an argument of type `ListMyStoryChangesVariables`:
const listMyStoryChangesVars: ListMyStoryChangesVariables = {
  changedAfter: ..., 
  limit: ..., // optional
};

// Call the `listMyStoryChangesRef()` function to get a reference to the query.
const ref = listMyStoryChangesRef(listMyStoryChangesVars);
// Variables can be defined inline as well.
const ref = listMyStoryChangesRef({ changedAfter: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyStoryChangesRef(dataConnect, listMyStoryChangesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.storyChanges);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.storyChanges);
});
```

## GetMyCurrentMediaSlot
You can execute the `GetMyCurrentMediaSlot` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMyCurrentMediaSlot(vars: GetMyCurrentMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;

interface GetMyCurrentMediaSlotRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyCurrentMediaSlotVariables): QueryRef<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;
}
export const getMyCurrentMediaSlotRef: GetMyCurrentMediaSlotRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyCurrentMediaSlot(dc: DataConnect, vars: GetMyCurrentMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;

interface GetMyCurrentMediaSlotRef {
  ...
  (dc: DataConnect, vars: GetMyCurrentMediaSlotVariables): QueryRef<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;
}
export const getMyCurrentMediaSlotRef: GetMyCurrentMediaSlotRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyCurrentMediaSlotRef:
```typescript
const name = getMyCurrentMediaSlotRef.operationName;
console.log(name);
```

### Variables
The `GetMyCurrentMediaSlot` query requires an argument of type `GetMyCurrentMediaSlotVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyCurrentMediaSlotVariables {
  targetKind: string;
  targetKey: string;
  purpose: string;
}
```
### Return Type
Recall that executing the `GetMyCurrentMediaSlot` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyCurrentMediaSlotData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyCurrentMediaSlotData {
  mediaSlot?: {
    targetKind: string;
    targetKey: string;
    purpose: string;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
    currentAsset: {
      id: UUIDString;
      assetType: MediaAssetType;
      status: MediaAssetStatus;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    } & MediaAsset_Key;
  };
}
```
### Using `GetMyCurrentMediaSlot`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyCurrentMediaSlot, GetMyCurrentMediaSlotVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyCurrentMediaSlot` query requires an argument of type `GetMyCurrentMediaSlotVariables`:
const getMyCurrentMediaSlotVars: GetMyCurrentMediaSlotVariables = {
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
};

// Call the `getMyCurrentMediaSlot()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyCurrentMediaSlot(getMyCurrentMediaSlotVars);
// Variables can be defined inline as well.
const { data } = await getMyCurrentMediaSlot({ targetKind: ..., targetKey: ..., purpose: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyCurrentMediaSlot(dataConnect, getMyCurrentMediaSlotVars);

console.log(data.mediaSlot);

// Or, you can use the `Promise` API.
getMyCurrentMediaSlot(getMyCurrentMediaSlotVars).then((response) => {
  const data = response.data;
  console.log(data.mediaSlot);
});
```

### Using `GetMyCurrentMediaSlot`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyCurrentMediaSlotRef, GetMyCurrentMediaSlotVariables } from '@seihouse/celestial-library-dataconnect';

// The `GetMyCurrentMediaSlot` query requires an argument of type `GetMyCurrentMediaSlotVariables`:
const getMyCurrentMediaSlotVars: GetMyCurrentMediaSlotVariables = {
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
};

// Call the `getMyCurrentMediaSlotRef()` function to get a reference to the query.
const ref = getMyCurrentMediaSlotRef(getMyCurrentMediaSlotVars);
// Variables can be defined inline as well.
const ref = getMyCurrentMediaSlotRef({ targetKind: ..., targetKey: ..., purpose: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyCurrentMediaSlotRef(dataConnect, getMyCurrentMediaSlotVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaSlot);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaSlot);
});
```

## ListMyMediaSlotHistory
You can execute the `ListMyMediaSlotHistory` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyMediaSlotHistory(vars: ListMyMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;

interface ListMyMediaSlotHistoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMyMediaSlotHistoryVariables): QueryRef<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;
}
export const listMyMediaSlotHistoryRef: ListMyMediaSlotHistoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyMediaSlotHistory(dc: DataConnect, vars: ListMyMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;

interface ListMyMediaSlotHistoryRef {
  ...
  (dc: DataConnect, vars: ListMyMediaSlotHistoryVariables): QueryRef<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;
}
export const listMyMediaSlotHistoryRef: ListMyMediaSlotHistoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyMediaSlotHistoryRef:
```typescript
const name = listMyMediaSlotHistoryRef.operationName;
console.log(name);
```

### Variables
The `ListMyMediaSlotHistory` query requires an argument of type `ListMyMediaSlotHistoryVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMyMediaSlotHistoryVariables {
  targetKind: string;
  targetKey: string;
  purpose: string;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `ListMyMediaSlotHistory` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyMediaSlotHistoryData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyMediaSlotHistoryData {
  mediaAttachments: ({
    id: UUIDString;
    assetId: UUIDString;
    clientHistoryId?: string | null;
    promptUsed?: string | null;
    chapterNumber?: number | null;
    arcTitle?: string | null;
    label?: string | null;
    position: number;
    isCurrent: boolean;
    createdAt: TimestampString;
    endedAt?: TimestampString | null;
    asset: {
      assetType: MediaAssetType;
      status: MediaAssetStatus;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    };
  } & MediaAttachment_Key)[];
}
```
### Using `ListMyMediaSlotHistory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyMediaSlotHistory, ListMyMediaSlotHistoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `ListMyMediaSlotHistory` query requires an argument of type `ListMyMediaSlotHistoryVariables`:
const listMyMediaSlotHistoryVars: ListMyMediaSlotHistoryVariables = {
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  limit: ..., // optional
};

// Call the `listMyMediaSlotHistory()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyMediaSlotHistory(listMyMediaSlotHistoryVars);
// Variables can be defined inline as well.
const { data } = await listMyMediaSlotHistory({ targetKind: ..., targetKey: ..., purpose: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyMediaSlotHistory(dataConnect, listMyMediaSlotHistoryVars);

console.log(data.mediaAttachments);

// Or, you can use the `Promise` API.
listMyMediaSlotHistory(listMyMediaSlotHistoryVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachments);
});
```

### Using `ListMyMediaSlotHistory`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyMediaSlotHistoryRef, ListMyMediaSlotHistoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `ListMyMediaSlotHistory` query requires an argument of type `ListMyMediaSlotHistoryVariables`:
const listMyMediaSlotHistoryVars: ListMyMediaSlotHistoryVariables = {
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  limit: ..., // optional
};

// Call the `listMyMediaSlotHistoryRef()` function to get a reference to the query.
const ref = listMyMediaSlotHistoryRef(listMyMediaSlotHistoryVars);
// Variables can be defined inline as well.
const ref = listMyMediaSlotHistoryRef({ targetKind: ..., targetKey: ..., purpose: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyMediaSlotHistoryRef(dataConnect, listMyMediaSlotHistoryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAttachments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachments);
});
```

## AdminListOwnedStories
You can execute the `AdminListOwnedStories` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListOwnedStories(vars: AdminListOwnedStoriesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;

interface AdminListOwnedStoriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStoriesVariables): QueryRef<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;
}
export const adminListOwnedStoriesRef: AdminListOwnedStoriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListOwnedStories(dc: DataConnect, vars: AdminListOwnedStoriesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;

interface AdminListOwnedStoriesRef {
  ...
  (dc: DataConnect, vars: AdminListOwnedStoriesVariables): QueryRef<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;
}
export const adminListOwnedStoriesRef: AdminListOwnedStoriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListOwnedStoriesRef:
```typescript
const name = adminListOwnedStoriesRef.operationName;
console.log(name);
```

### Variables
The `AdminListOwnedStories` query requires an argument of type `AdminListOwnedStoriesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListOwnedStoriesVariables {
  ownerUid: string;
  limit?: number | null;
  offset?: number | null;
}
```
### Return Type
Recall that executing the `AdminListOwnedStories` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListOwnedStoriesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListOwnedStoriesData {
  stories: ({
    id: UUIDString;
    ownerUid: string;
    sourceSeedId?: UUIDString | null;
    parentStoryId?: UUIDString | null;
    legacyStoryId?: string | null;
    clientStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    forkChapterNumber?: number | null;
    syncRevision?: string | null;
    revision: Int64String;
    schemaVersion: number;
    lastImageChapter?: number | null;
    evolutionReady: boolean;
    evolutionReason?: string | null;
    availableVisualUpdate: boolean;
    isEdited: boolean;
    conflictResolvedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key)[];
}
```
### Using `AdminListOwnedStories`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStories, AdminListOwnedStoriesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStories` query requires an argument of type `AdminListOwnedStoriesVariables`:
const adminListOwnedStoriesVars: AdminListOwnedStoriesVariables = {
  ownerUid: ..., 
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListOwnedStories()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListOwnedStories(adminListOwnedStoriesVars);
// Variables can be defined inline as well.
const { data } = await adminListOwnedStories({ ownerUid: ..., limit: ..., offset: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListOwnedStories(dataConnect, adminListOwnedStoriesVars);

console.log(data.stories);

// Or, you can use the `Promise` API.
adminListOwnedStories(adminListOwnedStoriesVars).then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

### Using `AdminListOwnedStories`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStoriesRef, AdminListOwnedStoriesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStories` query requires an argument of type `AdminListOwnedStoriesVariables`:
const adminListOwnedStoriesVars: AdminListOwnedStoriesVariables = {
  ownerUid: ..., 
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListOwnedStoriesRef()` function to get a reference to the query.
const ref = adminListOwnedStoriesRef(adminListOwnedStoriesVars);
// Variables can be defined inline as well.
const ref = adminListOwnedStoriesRef({ ownerUid: ..., limit: ..., offset: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListOwnedStoriesRef(dataConnect, adminListOwnedStoriesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.stories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

## AdminListOwnedStoryCoverSlots
You can execute the `AdminListOwnedStoryCoverSlots` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListOwnedStoryCoverSlots(vars: AdminListOwnedStoryCoverSlotsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;

interface AdminListOwnedStoryCoverSlotsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStoryCoverSlotsVariables): QueryRef<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;
}
export const adminListOwnedStoryCoverSlotsRef: AdminListOwnedStoryCoverSlotsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListOwnedStoryCoverSlots(dc: DataConnect, vars: AdminListOwnedStoryCoverSlotsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;

interface AdminListOwnedStoryCoverSlotsRef {
  ...
  (dc: DataConnect, vars: AdminListOwnedStoryCoverSlotsVariables): QueryRef<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;
}
export const adminListOwnedStoryCoverSlotsRef: AdminListOwnedStoryCoverSlotsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListOwnedStoryCoverSlotsRef:
```typescript
const name = adminListOwnedStoryCoverSlotsRef.operationName;
console.log(name);
```

### Variables
The `AdminListOwnedStoryCoverSlots` query requires an argument of type `AdminListOwnedStoryCoverSlotsVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListOwnedStoryCoverSlotsVariables {
  ownerUid: string;
  limit?: number | null;
  offset?: number | null;
}
```
### Return Type
Recall that executing the `AdminListOwnedStoryCoverSlots` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListOwnedStoryCoverSlotsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListOwnedStoryCoverSlotsData {
  coverSlots: ({
    ownerUid: string;
    storyId?: UUIDString | null;
    targetKey: string;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
    currentAsset: {
      status: MediaAssetStatus;
      mimeType: string;
      checksumSha256: string;
      version: number;
    };
  })[];
}
```
### Using `AdminListOwnedStoryCoverSlots`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStoryCoverSlots, AdminListOwnedStoryCoverSlotsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStoryCoverSlots` query requires an argument of type `AdminListOwnedStoryCoverSlotsVariables`:
const adminListOwnedStoryCoverSlotsVars: AdminListOwnedStoryCoverSlotsVariables = {
  ownerUid: ..., 
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListOwnedStoryCoverSlots()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListOwnedStoryCoverSlots(adminListOwnedStoryCoverSlotsVars);
// Variables can be defined inline as well.
const { data } = await adminListOwnedStoryCoverSlots({ ownerUid: ..., limit: ..., offset: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListOwnedStoryCoverSlots(dataConnect, adminListOwnedStoryCoverSlotsVars);

console.log(data.coverSlots);

// Or, you can use the `Promise` API.
adminListOwnedStoryCoverSlots(adminListOwnedStoryCoverSlotsVars).then((response) => {
  const data = response.data;
  console.log(data.coverSlots);
});
```

### Using `AdminListOwnedStoryCoverSlots`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStoryCoverSlotsRef, AdminListOwnedStoryCoverSlotsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStoryCoverSlots` query requires an argument of type `AdminListOwnedStoryCoverSlotsVariables`:
const adminListOwnedStoryCoverSlotsVars: AdminListOwnedStoryCoverSlotsVariables = {
  ownerUid: ..., 
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListOwnedStoryCoverSlotsRef()` function to get a reference to the query.
const ref = adminListOwnedStoryCoverSlotsRef(adminListOwnedStoryCoverSlotsVars);
// Variables can be defined inline as well.
const ref = adminListOwnedStoryCoverSlotsRef({ ownerUid: ..., limit: ..., offset: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListOwnedStoryCoverSlotsRef(dataConnect, adminListOwnedStoryCoverSlotsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.coverSlots);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.coverSlots);
});
```

## AdminListOwnedStoryChanges
You can execute the `AdminListOwnedStoryChanges` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListOwnedStoryChanges(vars: AdminListOwnedStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;

interface AdminListOwnedStoryChangesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStoryChangesVariables): QueryRef<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;
}
export const adminListOwnedStoryChangesRef: AdminListOwnedStoryChangesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListOwnedStoryChanges(dc: DataConnect, vars: AdminListOwnedStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;

interface AdminListOwnedStoryChangesRef {
  ...
  (dc: DataConnect, vars: AdminListOwnedStoryChangesVariables): QueryRef<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;
}
export const adminListOwnedStoryChangesRef: AdminListOwnedStoryChangesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListOwnedStoryChangesRef:
```typescript
const name = adminListOwnedStoryChangesRef.operationName;
console.log(name);
```

### Variables
The `AdminListOwnedStoryChanges` query requires an argument of type `AdminListOwnedStoryChangesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListOwnedStoryChangesVariables {
  ownerUid: string;
  changedAfter: TimestampString;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListOwnedStoryChanges` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListOwnedStoryChangesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListOwnedStoryChangesData {
  storyChanges: ({
    id: UUIDString;
    ownerUid: string;
    storyId: UUIDString;
    changeKind: StoryChangeKind;
    storyRevision: Int64String;
    syncRevision: string;
    idempotencyKey: string;
    changedAt: TimestampString;
  } & StoryChange_Key)[];
}
```
### Using `AdminListOwnedStoryChanges`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStoryChanges, AdminListOwnedStoryChangesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStoryChanges` query requires an argument of type `AdminListOwnedStoryChangesVariables`:
const adminListOwnedStoryChangesVars: AdminListOwnedStoryChangesVariables = {
  ownerUid: ..., 
  changedAfter: ..., 
  limit: ..., // optional
};

// Call the `adminListOwnedStoryChanges()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListOwnedStoryChanges(adminListOwnedStoryChangesVars);
// Variables can be defined inline as well.
const { data } = await adminListOwnedStoryChanges({ ownerUid: ..., changedAfter: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListOwnedStoryChanges(dataConnect, adminListOwnedStoryChangesVars);

console.log(data.storyChanges);

// Or, you can use the `Promise` API.
adminListOwnedStoryChanges(adminListOwnedStoryChangesVars).then((response) => {
  const data = response.data;
  console.log(data.storyChanges);
});
```

### Using `AdminListOwnedStoryChanges`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStoryChangesRef, AdminListOwnedStoryChangesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStoryChanges` query requires an argument of type `AdminListOwnedStoryChangesVariables`:
const adminListOwnedStoryChangesVars: AdminListOwnedStoryChangesVariables = {
  ownerUid: ..., 
  changedAfter: ..., 
  limit: ..., // optional
};

// Call the `adminListOwnedStoryChangesRef()` function to get a reference to the query.
const ref = adminListOwnedStoryChangesRef(adminListOwnedStoryChangesVars);
// Variables can be defined inline as well.
const ref = adminListOwnedStoryChangesRef({ ownerUid: ..., changedAfter: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListOwnedStoryChangesRef(dataConnect, adminListOwnedStoryChangesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.storyChanges);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.storyChanges);
});
```

## AdminGetPersistenceReceipt
You can execute the `AdminGetPersistenceReceipt` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetPersistenceReceipt(vars: AdminGetPersistenceReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;

interface AdminGetPersistenceReceiptRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetPersistenceReceiptVariables): QueryRef<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;
}
export const adminGetPersistenceReceiptRef: AdminGetPersistenceReceiptRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetPersistenceReceipt(dc: DataConnect, vars: AdminGetPersistenceReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;

interface AdminGetPersistenceReceiptRef {
  ...
  (dc: DataConnect, vars: AdminGetPersistenceReceiptVariables): QueryRef<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;
}
export const adminGetPersistenceReceiptRef: AdminGetPersistenceReceiptRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetPersistenceReceiptRef:
```typescript
const name = adminGetPersistenceReceiptRef.operationName;
console.log(name);
```

### Variables
The `AdminGetPersistenceReceipt` query requires an argument of type `AdminGetPersistenceReceiptVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetPersistenceReceiptVariables {
  ownerUid: string;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminGetPersistenceReceipt` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetPersistenceReceiptData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetPersistenceReceiptData {
  persistenceReceipt?: {
    ownerUid: string;
    idempotencyKey: string;
    operation: string;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    seedId?: UUIDString | null;
    resultingSyncRevision?: string | null;
    resultingRevision?: Int64String | null;
    requestHash?: string | null;
    createdAt: TimestampString;
  } & PersistenceReceipt_Key;
}
```
### Using `AdminGetPersistenceReceipt`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetPersistenceReceipt, AdminGetPersistenceReceiptVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetPersistenceReceipt` query requires an argument of type `AdminGetPersistenceReceiptVariables`:
const adminGetPersistenceReceiptVars: AdminGetPersistenceReceiptVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetPersistenceReceipt()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetPersistenceReceipt(adminGetPersistenceReceiptVars);
// Variables can be defined inline as well.
const { data } = await adminGetPersistenceReceipt({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetPersistenceReceipt(dataConnect, adminGetPersistenceReceiptVars);

console.log(data.persistenceReceipt);

// Or, you can use the `Promise` API.
adminGetPersistenceReceipt(adminGetPersistenceReceiptVars).then((response) => {
  const data = response.data;
  console.log(data.persistenceReceipt);
});
```

### Using `AdminGetPersistenceReceipt`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetPersistenceReceiptRef, AdminGetPersistenceReceiptVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetPersistenceReceipt` query requires an argument of type `AdminGetPersistenceReceiptVariables`:
const adminGetPersistenceReceiptVars: AdminGetPersistenceReceiptVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetPersistenceReceiptRef()` function to get a reference to the query.
const ref = adminGetPersistenceReceiptRef(adminGetPersistenceReceiptVars);
// Variables can be defined inline as well.
const ref = adminGetPersistenceReceiptRef({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetPersistenceReceiptRef(dataConnect, adminGetPersistenceReceiptVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.persistenceReceipt);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.persistenceReceipt);
});
```

## AdminGetOwnedStoryGraph
You can execute the `AdminGetOwnedStoryGraph` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedStoryGraph(vars: AdminGetOwnedStoryGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;

interface AdminGetOwnedStoryGraphRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStoryGraphVariables): QueryRef<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;
}
export const adminGetOwnedStoryGraphRef: AdminGetOwnedStoryGraphRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedStoryGraph(dc: DataConnect, vars: AdminGetOwnedStoryGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;

interface AdminGetOwnedStoryGraphRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedStoryGraphVariables): QueryRef<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;
}
export const adminGetOwnedStoryGraphRef: AdminGetOwnedStoryGraphRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedStoryGraphRef:
```typescript
const name = adminGetOwnedStoryGraphRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedStoryGraph` query requires an argument of type `AdminGetOwnedStoryGraphVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedStoryGraphVariables {
  ownerUid: string;
  storyId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedStoryGraph` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedStoryGraphData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedStoryGraphData {
  story?: {
    id: UUIDString;
    ownerUid: string;
    sourceSeedId?: UUIDString | null;
    parentStoryId?: UUIDString | null;
    legacyStoryId?: string | null;
    clientStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    forkChapterNumber?: number | null;
    syncRevision?: string | null;
    revision: Int64String;
    schemaVersion: number;
    lastImageChapter?: number | null;
    evolutionReady: boolean;
    evolutionReason?: string | null;
    availableVisualUpdate: boolean;
    isEdited: boolean;
    conflictResolvedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key;
  members: ({
    storyId: UUIDString;
    userUid: string;
    role: StoryMemberRole;
    createdAt: TimestampString;
  } & StoryMember_Key)[];
  preferences: ({
    storyId: UUIDString;
    contextEngine?: string | null;
    hardcoreFateMode: boolean;
    fatePressure?: string | null;
    motionCoverActive: boolean;
    assignedRevealBackdropPolicy?: string | null;
    updatedAt: TimestampString;
  } & StoryPreference_Key)[];
  readerPreferences: ({
    storyId: UUIDString;
    userUid: string;
    fontSize?: string | null;
    fontFamily?: string | null;
    lineHeight?: string | null;
    paragraphSpacing?: string | null;
    lineHeightScale?: number | null;
    paragraphSpacingScale?: number | null;
    letterSpacing?: number | null;
    wordSpacing?: number | null;
    readingWidth?: number | null;
    textAlignment?: string | null;
    contextEngine?: string | null;
    themeOverride?: string | null;
    colorPaletteId?: string | null;
    highlightStyle?: string | null;
    updatedAt: TimestampString;
  } & StoryReaderPreference_Key)[];
  memoryStates: ({
    storyId: UUIDString;
    powerSystem?: string | null;
    currentPowerStage?: string | null;
    updatedAt: TimestampString;
  } & StoryMemoryState_Key)[];
  memoryWarnings: ({
    id: UUIDString;
    warning: string;
    resolvedAt?: TimestampString | null;
    createdAt: TimestampString;
  } & StoryMemoryWarning_Key)[];
  rules: ({
    id: UUIDString;
    ruleKey: string;
    ruleValue: string;
    isPinned: boolean;
    position: number;
    updatedAt: TimestampString;
  } & StoryRule_Key)[];
  revealBackdrops: ({
    entityStableKey: string;
    backdropAssetId: string;
    updatedAt: TimestampString;
  })[];
  arcs: ({
    id: UUIDString;
    arcNumber: number;
    title: string;
    summary?: string | null;
    episodicSummaries?: string[] | null;
    status: ArcStatus;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & StoryArc_Key)[];
  chapters: ({
    id: UUIDString;
    storyId: UUIDString;
    arcId?: UUIDString | null;
    legacyChapterId?: string | null;
    clientChapterId?: string | null;
    chapterNumber: number;
    title: string;
    premise?: string | null;
    status: ChapterStatus;
    summary?: string | null;
    episodicSummary?: string | null;
    contentHash?: string | null;
    versionId?: string | null;
    syncRevision?: string | null;
    revision: Int64String;
    branchAnchor?: string | null;
    continuityWarnings?: string[] | null;
    continuitySoftNotes?: string[] | null;
    contractObjectiveFulfilled?: boolean | null;
    contractEvidence?: string | null;
    contractOpeningMatched?: boolean | null;
    embedding?: number[] | null;
    isSealed: boolean;
    sealedAt?: TimestampString | null;
    hasContinuityFaults: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Chapter_Key)[];
  codexEntities: ({
    id: UUIDString;
    stableKey: string;
    kind: CodexEntityKind;
    name: string;
    role?: string | null;
    description?: string | null;
    status?: string | null;
    relationshipToMainCharacter?: string | null;
    relevanceState: CodexRelevanceState;
    contextPriority?: number | null;
    authorContextNote?: string | null;
    firstAppearedChapter?: number | null;
    lastMajorInvolvementChapter?: number | null;
    currentRelevance?: string | null;
    toneMemory?: string | null;
    manifestationImportance?: string | null;
    isUserPinned: boolean;
    pendingEvolution: boolean;
    evolutionReady: boolean;
    evolutionReason?: string | null;
    availableVisualUpdate: boolean;
    lastImageChapter?: number | null;
    arcAccumulation?: string | null;
    sourceChapterNumber?: number | null;
    sourceBlockId?: string | null;
    provenanceCreatedBy?: string | null;
    provenanceConfidence?: number | null;
    lastMentionedChapter?: number | null;
    supersedesStableKey?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    aliases: ({
      alias: string;
      normalizedAlias: string;
      isCanonical: boolean;
    })[];
    attributes: ({
      attributeKey: string;
      stringValue?: string | null;
      numberValue?: number | null;
      booleanValue?: boolean | null;
      stringListValue?: string[] | null;
      jsonValue?: unknown | null;
      updatedAt: TimestampString;
    })[];
    progression: ({
      id: UUIDString;
      chapterNumber: number;
      fromMastery?: string | null;
      toMastery?: string | null;
      note?: string | null;
      createdAt: TimestampString;
    } & AbilityProgressionEvent_Key)[];
    threadLinks: ({
      threadId: UUIDString;
      createdAt: TimestampString;
    })[];
  } & CodexEntity_Key)[];
  codexRelationships: ({
    id: UUIDString;
    sourceEntityId?: UUIDString | null;
    targetEntityId?: UUIDString | null;
    sourceStableKey: string;
    targetStableKey: string;
    sourceName: string;
    targetName: string;
    relationshipKind: string;
    affinity?: number | null;
    threat?: number | null;
    description?: string | null;
    status?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & CodexRelationship_Key)[];
  plotThreads: ({
    id: UUIDString;
    stableKey?: string | null;
    description: string;
    status: PlotThreadStatus;
    originChapterNumber?: number | null;
    resolvedChapterNumber?: number | null;
    confidence?: number | null;
    isUserPinned: boolean;
    sourceChapterNumber?: number | null;
    sourceBlockId?: string | null;
    provenanceCreatedBy?: string | null;
    provenanceConfidence?: number | null;
    lastMentionedChapter?: number | null;
    supersedesStableKey?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & PlotThread_Key)[];
  karmaNodes: ({
    id: UUIDString;
    sourceEntityId?: UUIDString | null;
    targetEntityId?: UUIDString | null;
    sourceStableKey?: string | null;
    targetStableKey?: string | null;
    sourceName: string;
    targetName: string;
    description: string;
    severity: string;
    nodeType: string;
    status: string;
    createdAt: TimestampString;
    resolvedAt?: TimestampString | null;
  } & KarmaNode_Key)[];
  timelineEvents: ({
    id: UUIDString;
    chapterId?: UUIDString | null;
    chapterNumber?: number | null;
    title: string;
    description: string;
    eventType?: string | null;
    occurredAtLabel?: string | null;
    createdAt: TimestampString;
  } & TimelineEvent_Key)[];
  bookmarks: ({
    id: UUIDString;
    userUid: string;
    chapterId?: UUIDString | null;
    paragraphIndex: number;
    paragraphExcerpt: string;
    note?: string | null;
    createdAt: TimestampString;
  } & Bookmark_Key)[];
  readingProgresses: ({
    userUid: string;
    chapterNumber: number;
    anchorBlockId?: string | null;
    anchorText?: string | null;
    anchorOffset?: number | null;
    anchorParagraphIndex?: number | null;
    anchorContentSignature?: string | null;
    anchorIntraBlockRatio?: number | null;
    anchorSavedAt?: TimestampString | null;
    legacyScrollPosition?: number | null;
    anchor?: unknown | null;
    totalReadingTimeMs: Int64String;
    lastReadAt: TimestampString;
    updatedAt: TimestampString;
  })[];
  arcReadingProgresses: ({
    userUid: string;
    arcNumber: number;
    readingTimeMs: Int64String;
    updatedAt: TimestampString;
  })[];
  glossaryTerms: ({
    id: UUIDString;
    sourceText: string;
    targetText: string;
    targetLanguage: string;
    note?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & GlossaryTerm_Key)[];
  generationJobs: ({
    id: UUIDString;
    chapterId?: UUIDString | null;
    kind: GenerationJobKind;
    status: GenerationJobStatus;
    provider?: string | null;
    model?: string | null;
    inputHash?: string | null;
    idempotencyKey?: string | null;
    attemptCount: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    startedAt?: TimestampString | null;
    completedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    events: ({
      id: UUIDString;
      eventType: string;
      message?: string | null;
      progress?: number | null;
      createdAt: TimestampString;
    } & GenerationEvent_Key)[];
  } & GenerationJob_Key)[];
  generationBatches: ({
    id: UUIDString;
    clientBatchId: string;
    status: string;
    currentChapterNumber?: number | null;
    failedChapterNumber?: number | null;
    errorMessage?: string | null;
    createdAt: TimestampString;
    completedAt?: TimestampString | null;
    updatedAt: TimestampString;
    items: ({
      chapterNumber: number;
      status: string;
      completedAt?: TimestampString | null;
      updatedAt: TimestampString;
    })[];
  } & ChapterGenerationBatch_Key)[];
  mediaSlots: ({
    targetKind: string;
    targetKey: string;
    purpose: string;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
  })[];
  mediaAttachments: ({
    id: UUIDString;
    assetId: UUIDString;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    targetKind: string;
    targetKey: string;
    purpose: string;
    clientHistoryId?: string | null;
    promptUsed?: string | null;
    chapterNumber?: number | null;
    arcTitle?: string | null;
    label?: string | null;
    position: number;
    isCurrent: boolean;
    createdAt: TimestampString;
    endedAt?: TimestampString | null;
  } & MediaAttachment_Key)[];
  deletionJobs: ({
    id: UUIDString;
    idempotencyKey: string;
    status: StoryDeletionStatus;
    currentStage: StoryDeletionStageKind;
    leaseOwner?: string | null;
    leaseExpiresAt?: TimestampString | null;
    attemptCount: number;
    lastError?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
    stages: ({
      stage: StoryDeletionStageKind;
      status: StoryDeletionStageStatus;
      attemptCount: number;
      lastError?: string | null;
      startedAt?: TimestampString | null;
      completedAt?: TimestampString | null;
      updatedAt: TimestampString;
    })[];
  } & StoryDeletionJob_Key)[];
}
```
### Using `AdminGetOwnedStoryGraph`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStoryGraph, AdminGetOwnedStoryGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStoryGraph` query requires an argument of type `AdminGetOwnedStoryGraphVariables`:
const adminGetOwnedStoryGraphVars: AdminGetOwnedStoryGraphVariables = {
  ownerUid: ..., 
  storyId: ..., 
};

// Call the `adminGetOwnedStoryGraph()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedStoryGraph(adminGetOwnedStoryGraphVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedStoryGraph({ ownerUid: ..., storyId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedStoryGraph(dataConnect, adminGetOwnedStoryGraphVars);

console.log(data.story);
console.log(data.members);
console.log(data.preferences);
console.log(data.readerPreferences);
console.log(data.memoryStates);
console.log(data.memoryWarnings);
console.log(data.rules);
console.log(data.revealBackdrops);
console.log(data.arcs);
console.log(data.chapters);
console.log(data.codexEntities);
console.log(data.codexRelationships);
console.log(data.plotThreads);
console.log(data.karmaNodes);
console.log(data.timelineEvents);
console.log(data.bookmarks);
console.log(data.readingProgresses);
console.log(data.arcReadingProgresses);
console.log(data.glossaryTerms);
console.log(data.generationJobs);
console.log(data.generationBatches);
console.log(data.mediaSlots);
console.log(data.mediaAttachments);
console.log(data.deletionJobs);

// Or, you can use the `Promise` API.
adminGetOwnedStoryGraph(adminGetOwnedStoryGraphVars).then((response) => {
  const data = response.data;
  console.log(data.story);
  console.log(data.members);
  console.log(data.preferences);
  console.log(data.readerPreferences);
  console.log(data.memoryStates);
  console.log(data.memoryWarnings);
  console.log(data.rules);
  console.log(data.revealBackdrops);
  console.log(data.arcs);
  console.log(data.chapters);
  console.log(data.codexEntities);
  console.log(data.codexRelationships);
  console.log(data.plotThreads);
  console.log(data.karmaNodes);
  console.log(data.timelineEvents);
  console.log(data.bookmarks);
  console.log(data.readingProgresses);
  console.log(data.arcReadingProgresses);
  console.log(data.glossaryTerms);
  console.log(data.generationJobs);
  console.log(data.generationBatches);
  console.log(data.mediaSlots);
  console.log(data.mediaAttachments);
  console.log(data.deletionJobs);
});
```

### Using `AdminGetOwnedStoryGraph`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStoryGraphRef, AdminGetOwnedStoryGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStoryGraph` query requires an argument of type `AdminGetOwnedStoryGraphVariables`:
const adminGetOwnedStoryGraphVars: AdminGetOwnedStoryGraphVariables = {
  ownerUid: ..., 
  storyId: ..., 
};

// Call the `adminGetOwnedStoryGraphRef()` function to get a reference to the query.
const ref = adminGetOwnedStoryGraphRef(adminGetOwnedStoryGraphVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedStoryGraphRef({ ownerUid: ..., storyId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedStoryGraphRef(dataConnect, adminGetOwnedStoryGraphVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.story);
console.log(data.members);
console.log(data.preferences);
console.log(data.readerPreferences);
console.log(data.memoryStates);
console.log(data.memoryWarnings);
console.log(data.rules);
console.log(data.revealBackdrops);
console.log(data.arcs);
console.log(data.chapters);
console.log(data.codexEntities);
console.log(data.codexRelationships);
console.log(data.plotThreads);
console.log(data.karmaNodes);
console.log(data.timelineEvents);
console.log(data.bookmarks);
console.log(data.readingProgresses);
console.log(data.arcReadingProgresses);
console.log(data.glossaryTerms);
console.log(data.generationJobs);
console.log(data.generationBatches);
console.log(data.mediaSlots);
console.log(data.mediaAttachments);
console.log(data.deletionJobs);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.story);
  console.log(data.members);
  console.log(data.preferences);
  console.log(data.readerPreferences);
  console.log(data.memoryStates);
  console.log(data.memoryWarnings);
  console.log(data.rules);
  console.log(data.revealBackdrops);
  console.log(data.arcs);
  console.log(data.chapters);
  console.log(data.codexEntities);
  console.log(data.codexRelationships);
  console.log(data.plotThreads);
  console.log(data.karmaNodes);
  console.log(data.timelineEvents);
  console.log(data.bookmarks);
  console.log(data.readingProgresses);
  console.log(data.arcReadingProgresses);
  console.log(data.glossaryTerms);
  console.log(data.generationJobs);
  console.log(data.generationBatches);
  console.log(data.mediaSlots);
  console.log(data.mediaAttachments);
  console.log(data.deletionJobs);
});
```

## AdminGetOwnedChapterContentGraph
You can execute the `AdminGetOwnedChapterContentGraph` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedChapterContentGraph(vars: AdminGetOwnedChapterContentGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;

interface AdminGetOwnedChapterContentGraphRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedChapterContentGraphVariables): QueryRef<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;
}
export const adminGetOwnedChapterContentGraphRef: AdminGetOwnedChapterContentGraphRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedChapterContentGraph(dc: DataConnect, vars: AdminGetOwnedChapterContentGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;

interface AdminGetOwnedChapterContentGraphRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedChapterContentGraphVariables): QueryRef<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;
}
export const adminGetOwnedChapterContentGraphRef: AdminGetOwnedChapterContentGraphRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedChapterContentGraphRef:
```typescript
const name = adminGetOwnedChapterContentGraphRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedChapterContentGraph` query requires an argument of type `AdminGetOwnedChapterContentGraphVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedChapterContentGraphVariables {
  ownerUid: string;
  storyId: UUIDString;
  chapterId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedChapterContentGraph` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedChapterContentGraphData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedChapterContentGraphData {
  chapter?: {
    id: UUIDString;
    storyId: UUIDString;
    arcId?: UUIDString | null;
    legacyChapterId?: string | null;
    clientChapterId?: string | null;
    chapterNumber: number;
    title: string;
    premise?: string | null;
    status: ChapterStatus;
    summary?: string | null;
    episodicSummary?: string | null;
    contentHash?: string | null;
    versionId?: string | null;
    syncRevision?: string | null;
    revision: Int64String;
    branchAnchor?: string | null;
    continuityWarnings?: string[] | null;
    continuitySoftNotes?: string[] | null;
    contractObjectiveFulfilled?: boolean | null;
    contractEvidence?: string | null;
    contractOpeningMatched?: boolean | null;
    embedding?: number[] | null;
    isSealed: boolean;
    sealedAt?: TimestampString | null;
    hasContinuityFaults: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    content?: {
      generatedContent: string;
      statsChangeMessage?: string | null;
      contextEngine?: string | null;
      contextRoute?: string | null;
      contextEstimatedTokens?: number | null;
      contextBudgetTokens?: number | null;
      contractObjective?: string | null;
      contractRequiredOpening?: string | null;
      handoffNextImmediateAction?: string | null;
      handoffEndLocation?: string | null;
      handoffEndTimeMarker?: string | null;
      handoffMainCharacterCondition?: string | null;
      handoffOpenTension?: string | null;
      revisionId?: string | null;
      syncRevision?: string | null;
      revision: Int64String;
      cuePayload?: unknown | null;
      contextManifest?: unknown | null;
      handoff?: unknown | null;
      contract?: unknown | null;
      updatedAt: TimestampString;
    };
    blocks: ({
      id: UUIDString;
      legacyBlockId?: string | null;
      position: number;
      blockType: string;
      text: string;
      speakerName?: string | null;
      speakerRole?: string | null;
      mode?: string | null;
      sceneType?: string | null;
      environment?: string[] | null;
      atmosphereCategory?: string | null;
      atmosphereTags?: string[] | null;
      theme?: string[] | null;
      motion?: string | null;
      emotion?: string | null;
      intensity?: number | null;
      tension?: number | null;
      danger?: number | null;
      mysticism?: number | null;
      audioSignature?: string | null;
      isArchived: boolean;
      music?: unknown | null;
      beastEvent?: unknown | null;
      systemEvent?: unknown | null;
      worldCard?: unknown | null;
      attributes: ({
        attributeKey: string;
        stringValue?: string | null;
        numberValue?: number | null;
        booleanValue?: boolean | null;
      })[];
      entityMentions: ({
        position: number;
        entityId?: UUIDString | null;
        name: string;
        entityType: string;
        mentionKind: string;
      })[];
    } & ChapterBlock_Key)[];
    translations: ({
      languageCode: string;
      title: string;
      content: string;
      translatedAt: TimestampString;
    })[];
    audioManifest?: {
      version: string;
      language: string;
      generatedAt: TimestampString;
      updatedAt: TimestampString;
    };
    voiceClips: ({
      id: UUIDString;
      blockId?: UUIDString | null;
      position: number;
      speakerVoice: string;
      assetId?: UUIDString | null;
      catalogId?: string | null;
      createdAt: TimestampString;
    } & ChapterVoiceClip_Key)[];
  } & Chapter_Key;
  fingerprints: ({
    id: UUIDString;
    chapterNumber: number;
    actionType: string;
    location?: string | null;
    outcome: string;
    participants: string[];
    createdAt: TimestampString;
  } & ChapterSceneFingerprint_Key)[];
  facts: ({
    id: UUIDString;
    chapterNumber: number;
    factKind: string;
    subjectKey?: string | null;
    factText: string;
    confidence?: number | null;
    isPinned: boolean;
    createdAt: TimestampString;
    newerSupersessions: ({
      olderFactId: UUIDString;
      createdAt: TimestampString;
    })[];
  } & ChapterFact_Key)[];
}
```
### Using `AdminGetOwnedChapterContentGraph`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedChapterContentGraph, AdminGetOwnedChapterContentGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedChapterContentGraph` query requires an argument of type `AdminGetOwnedChapterContentGraphVariables`:
const adminGetOwnedChapterContentGraphVars: AdminGetOwnedChapterContentGraphVariables = {
  ownerUid: ..., 
  storyId: ..., 
  chapterId: ..., 
};

// Call the `adminGetOwnedChapterContentGraph()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedChapterContentGraph(adminGetOwnedChapterContentGraphVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedChapterContentGraph({ ownerUid: ..., storyId: ..., chapterId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedChapterContentGraph(dataConnect, adminGetOwnedChapterContentGraphVars);

console.log(data.chapter);
console.log(data.fingerprints);
console.log(data.facts);

// Or, you can use the `Promise` API.
adminGetOwnedChapterContentGraph(adminGetOwnedChapterContentGraphVars).then((response) => {
  const data = response.data;
  console.log(data.chapter);
  console.log(data.fingerprints);
  console.log(data.facts);
});
```

### Using `AdminGetOwnedChapterContentGraph`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedChapterContentGraphRef, AdminGetOwnedChapterContentGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedChapterContentGraph` query requires an argument of type `AdminGetOwnedChapterContentGraphVariables`:
const adminGetOwnedChapterContentGraphVars: AdminGetOwnedChapterContentGraphVariables = {
  ownerUid: ..., 
  storyId: ..., 
  chapterId: ..., 
};

// Call the `adminGetOwnedChapterContentGraphRef()` function to get a reference to the query.
const ref = adminGetOwnedChapterContentGraphRef(adminGetOwnedChapterContentGraphVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedChapterContentGraphRef({ ownerUid: ..., storyId: ..., chapterId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedChapterContentGraphRef(dataConnect, adminGetOwnedChapterContentGraphVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chapter);
console.log(data.fingerprints);
console.log(data.facts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chapter);
  console.log(data.fingerprints);
  console.log(data.facts);
});
```

## AdminListOwnedStorySeeds
You can execute the `AdminListOwnedStorySeeds` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListOwnedStorySeeds(vars: AdminListOwnedStorySeedsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;

interface AdminListOwnedStorySeedsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStorySeedsVariables): QueryRef<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;
}
export const adminListOwnedStorySeedsRef: AdminListOwnedStorySeedsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListOwnedStorySeeds(dc: DataConnect, vars: AdminListOwnedStorySeedsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;

interface AdminListOwnedStorySeedsRef {
  ...
  (dc: DataConnect, vars: AdminListOwnedStorySeedsVariables): QueryRef<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;
}
export const adminListOwnedStorySeedsRef: AdminListOwnedStorySeedsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListOwnedStorySeedsRef:
```typescript
const name = adminListOwnedStorySeedsRef.operationName;
console.log(name);
```

### Variables
The `AdminListOwnedStorySeeds` query requires an argument of type `AdminListOwnedStorySeedsVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListOwnedStorySeedsVariables {
  ownerUid: string;
  limit?: number | null;
  offset?: number | null;
}
```
### Return Type
Recall that executing the `AdminListOwnedStorySeeds` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListOwnedStorySeedsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListOwnedStorySeedsData {
  storySeeds: ({
    id: UUIDString;
    legacySeedId?: string | null;
    clientSeedId?: string | null;
    title: string;
    schemaVersion: number;
    syncRevision?: string | null;
    revision: Int64String;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & StorySeed_Key)[];
}
```
### Using `AdminListOwnedStorySeeds`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStorySeeds, AdminListOwnedStorySeedsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStorySeeds` query requires an argument of type `AdminListOwnedStorySeedsVariables`:
const adminListOwnedStorySeedsVars: AdminListOwnedStorySeedsVariables = {
  ownerUid: ..., 
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListOwnedStorySeeds()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListOwnedStorySeeds(adminListOwnedStorySeedsVars);
// Variables can be defined inline as well.
const { data } = await adminListOwnedStorySeeds({ ownerUid: ..., limit: ..., offset: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListOwnedStorySeeds(dataConnect, adminListOwnedStorySeedsVars);

console.log(data.storySeeds);

// Or, you can use the `Promise` API.
adminListOwnedStorySeeds(adminListOwnedStorySeedsVars).then((response) => {
  const data = response.data;
  console.log(data.storySeeds);
});
```

### Using `AdminListOwnedStorySeeds`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedStorySeedsRef, AdminListOwnedStorySeedsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedStorySeeds` query requires an argument of type `AdminListOwnedStorySeedsVariables`:
const adminListOwnedStorySeedsVars: AdminListOwnedStorySeedsVariables = {
  ownerUid: ..., 
  limit: ..., // optional
  offset: ..., // optional
};

// Call the `adminListOwnedStorySeedsRef()` function to get a reference to the query.
const ref = adminListOwnedStorySeedsRef(adminListOwnedStorySeedsVars);
// Variables can be defined inline as well.
const ref = adminListOwnedStorySeedsRef({ ownerUid: ..., limit: ..., offset: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListOwnedStorySeedsRef(dataConnect, adminListOwnedStorySeedsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.storySeeds);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.storySeeds);
});
```

## AdminGetOwnedStorySeedGraph
You can execute the `AdminGetOwnedStorySeedGraph` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedStorySeedGraph(vars: AdminGetOwnedStorySeedGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;

interface AdminGetOwnedStorySeedGraphRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStorySeedGraphVariables): QueryRef<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;
}
export const adminGetOwnedStorySeedGraphRef: AdminGetOwnedStorySeedGraphRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedStorySeedGraph(dc: DataConnect, vars: AdminGetOwnedStorySeedGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;

interface AdminGetOwnedStorySeedGraphRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedStorySeedGraphVariables): QueryRef<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;
}
export const adminGetOwnedStorySeedGraphRef: AdminGetOwnedStorySeedGraphRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedStorySeedGraphRef:
```typescript
const name = adminGetOwnedStorySeedGraphRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedStorySeedGraph` query requires an argument of type `AdminGetOwnedStorySeedGraphVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedStorySeedGraphVariables {
  ownerUid: string;
  seedId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedStorySeedGraph` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedStorySeedGraphData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedStorySeedGraphData {
  storySeed?: {
    id: UUIDString;
    ownerUid: string;
    legacySeedId?: string | null;
    clientSeedId?: string | null;
    title: string;
    schemaVersion: number;
    syncRevision?: string | null;
    revision: Int64String;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    fields: ({
      section: string;
      fieldKey: string;
      position: number;
      stringValue?: string | null;
      numberValue?: number | null;
      booleanValue?: boolean | null;
    })[];
    entities: ({
      id: UUIDString;
      entityKind: string;
      clientEntityId: string;
      position: number;
      name: string;
      age?: string | null;
      skinTone?: string | null;
      eyeColor?: string | null;
      powerType?: string | null;
      rankLevel?: string | null;
      role?: string | null;
      powerLevel?: string | null;
      alignment?: string | null;
      connectionToMainCharacter?: string | null;
      description?: string | null;
      aliases: ({
        alias: string;
        normalizedAlias: string;
        position: number;
      })[];
    } & StorySeedEntity_Key)[];
  } & StorySeed_Key;
}
```
### Using `AdminGetOwnedStorySeedGraph`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStorySeedGraph, AdminGetOwnedStorySeedGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStorySeedGraph` query requires an argument of type `AdminGetOwnedStorySeedGraphVariables`:
const adminGetOwnedStorySeedGraphVars: AdminGetOwnedStorySeedGraphVariables = {
  ownerUid: ..., 
  seedId: ..., 
};

// Call the `adminGetOwnedStorySeedGraph()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedStorySeedGraph(adminGetOwnedStorySeedGraphVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedStorySeedGraph({ ownerUid: ..., seedId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedStorySeedGraph(dataConnect, adminGetOwnedStorySeedGraphVars);

console.log(data.storySeed);

// Or, you can use the `Promise` API.
adminGetOwnedStorySeedGraph(adminGetOwnedStorySeedGraphVars).then((response) => {
  const data = response.data;
  console.log(data.storySeed);
});
```

### Using `AdminGetOwnedStorySeedGraph`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStorySeedGraphRef, AdminGetOwnedStorySeedGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStorySeedGraph` query requires an argument of type `AdminGetOwnedStorySeedGraphVariables`:
const adminGetOwnedStorySeedGraphVars: AdminGetOwnedStorySeedGraphVariables = {
  ownerUid: ..., 
  seedId: ..., 
};

// Call the `adminGetOwnedStorySeedGraphRef()` function to get a reference to the query.
const ref = adminGetOwnedStorySeedGraphRef(adminGetOwnedStorySeedGraphVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedStorySeedGraphRef({ ownerUid: ..., seedId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedStorySeedGraphRef(dataConnect, adminGetOwnedStorySeedGraphVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.storySeed);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.storySeed);
});
```

## AdminGetUserProfileGraph
You can execute the `AdminGetUserProfileGraph` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetUserProfileGraph(vars: AdminGetUserProfileGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;

interface AdminGetUserProfileGraphRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetUserProfileGraphVariables): QueryRef<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;
}
export const adminGetUserProfileGraphRef: AdminGetUserProfileGraphRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetUserProfileGraph(dc: DataConnect, vars: AdminGetUserProfileGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;

interface AdminGetUserProfileGraphRef {
  ...
  (dc: DataConnect, vars: AdminGetUserProfileGraphVariables): QueryRef<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;
}
export const adminGetUserProfileGraphRef: AdminGetUserProfileGraphRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetUserProfileGraphRef:
```typescript
const name = adminGetUserProfileGraphRef.operationName;
console.log(name);
```

### Variables
The `AdminGetUserProfileGraph` query requires an argument of type `AdminGetUserProfileGraphVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetUserProfileGraphVariables {
  ownerUid: string;
}
```
### Return Type
Recall that executing the `AdminGetUserProfileGraph` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetUserProfileGraphData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetUserProfileGraphData {
  account?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: AccountRole;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserAccount_Key;
  profile?: {
    userUid: string;
    username?: string | null;
    displayNameColor?: string | null;
    preferredLanguage?: string | null;
    defaultTranslationLanguage?: string | null;
    subscriptionTier: SubscriptionTier;
    legacyQi?: Int64String | null;
    daoXp: Int64String;
    daoRank?: string | null;
    heavenlyQi: Int64String;
    sectQi: Int64String;
    demonicQi: Int64String;
    writingStreak: number;
    savedStoryCount: number;
    activePortraitAssetId?: UUIDString | null;
    imageGenerationCount: number;
    imageQuotaResetAt?: TimestampString | null;
    lastSessionEnd?: TimestampString | null;
    daoPillarStreak: number;
    daoPillarCracked: boolean;
    lastReadDate?: string | null;
    lastInteractionDate?: string | null;
    equippedInventoryItemId?: UUIDString | null;
    syncRevision?: string | null;
    revision: Int64String;
    lastReadAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserProfile_Key;
  preferences?: {
    userUid: string;
    fontSize?: string | null;
    fontFamily?: string | null;
    lineHeightScale?: number | null;
    paragraphSpacingScale?: number | null;
    letterSpacing?: number | null;
    wordSpacing?: number | null;
    readingWidth?: number | null;
    textAlignment?: string | null;
    contextEngine?: string | null;
    theme?: string | null;
    colorPaletteId?: string | null;
    highlightStyle?: string | null;
    audioMusicVolume?: number | null;
    audioAtmosphereVolume?: number | null;
    audioVoiceVolume?: number | null;
    updatedAt: TimestampString;
  } & UserPreference_Key;
  inventory: ({
    id: UUIDString;
    clientItemId?: string | null;
    catalogItemId?: string | null;
    itemKind: string;
    name: string;
    description?: string | null;
    rarity?: string | null;
    status: string;
    sourceStoryId?: UUIDString | null;
    sourceStoryTitle?: string | null;
    sourceMilestone?: string | null;
    milestoneType?: string | null;
    imageAssetId?: UUIDString | null;
    attributeBoost?: string | null;
    statusEffectDefinition?: unknown | null;
    offeringWeekId?: string | null;
    gatheredAt?: TimestampString | null;
    rewardValueQi?: Int64String | null;
    rewardValueSectMerit?: Int64String | null;
    acquiredAt: TimestampString;
    updatedAt: TimestampString;
  } & UserInventoryItem_Key)[];
  activeEffects: ({
    id: UUIDString;
    clientEffectId?: string | null;
    sourceInventoryItemId?: UUIDString | null;
    name: string;
    effectType: string;
    description: string;
    durationMs: Int64String;
    scope: string;
    visual?: string | null;
    counterplay?: string | null;
    rewardHook?: string | null;
    qiMultiplier?: number | null;
    sectQiMultiplier?: number | null;
    appliedAt: TimestampString;
    expiresAt: TimestampString;
    progress?: number | null;
    targetProgress?: number | null;
    completedAt?: TimestampString | null;
    isUnlockedReward: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserStatusEffect_Key)[];
  progressEvents: ({
    id: UUIDString;
    eventType: string;
    amount: Int64String;
    sourceType?: string | null;
    sourceId?: string | null;
    idempotencyKey?: string | null;
    createdAt: TimestampString;
  } & UserProgressEvent_Key)[];
  portraits: ({
    assetId: UUIDString;
    prompt?: string | null;
    description?: string | null;
    daoRank?: string | null;
    daoXp?: Int64String | null;
    powerStage?: string | null;
    equippedInventoryItemId?: UUIDString | null;
    usedReferenceImage: boolean;
    frameId?: string | null;
    glowId?: string | null;
    bannerId?: string | null;
    effectIds?: string[] | null;
    active: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserPortrait_Key)[];
  storageUsage?: {
    hardLimitBytes: Int64String;
    usedBytes: Int64String;
    reservedBytes: Int64String;
    assetCount: Int64String;
    revision: Int64String;
    updatedAt: TimestampString;
  };
}
```
### Using `AdminGetUserProfileGraph`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetUserProfileGraph, AdminGetUserProfileGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetUserProfileGraph` query requires an argument of type `AdminGetUserProfileGraphVariables`:
const adminGetUserProfileGraphVars: AdminGetUserProfileGraphVariables = {
  ownerUid: ..., 
};

// Call the `adminGetUserProfileGraph()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetUserProfileGraph(adminGetUserProfileGraphVars);
// Variables can be defined inline as well.
const { data } = await adminGetUserProfileGraph({ ownerUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetUserProfileGraph(dataConnect, adminGetUserProfileGraphVars);

console.log(data.account);
console.log(data.profile);
console.log(data.preferences);
console.log(data.inventory);
console.log(data.activeEffects);
console.log(data.progressEvents);
console.log(data.portraits);
console.log(data.storageUsage);

// Or, you can use the `Promise` API.
adminGetUserProfileGraph(adminGetUserProfileGraphVars).then((response) => {
  const data = response.data;
  console.log(data.account);
  console.log(data.profile);
  console.log(data.preferences);
  console.log(data.inventory);
  console.log(data.activeEffects);
  console.log(data.progressEvents);
  console.log(data.portraits);
  console.log(data.storageUsage);
});
```

### Using `AdminGetUserProfileGraph`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetUserProfileGraphRef, AdminGetUserProfileGraphVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetUserProfileGraph` query requires an argument of type `AdminGetUserProfileGraphVariables`:
const adminGetUserProfileGraphVars: AdminGetUserProfileGraphVariables = {
  ownerUid: ..., 
};

// Call the `adminGetUserProfileGraphRef()` function to get a reference to the query.
const ref = adminGetUserProfileGraphRef(adminGetUserProfileGraphVars);
// Variables can be defined inline as well.
const ref = adminGetUserProfileGraphRef({ ownerUid: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetUserProfileGraphRef(dataConnect, adminGetUserProfileGraphVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.account);
console.log(data.profile);
console.log(data.preferences);
console.log(data.inventory);
console.log(data.activeEffects);
console.log(data.progressEvents);
console.log(data.portraits);
console.log(data.storageUsage);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.account);
  console.log(data.profile);
  console.log(data.preferences);
  console.log(data.inventory);
  console.log(data.activeEffects);
  console.log(data.progressEvents);
  console.log(data.portraits);
  console.log(data.storageUsage);
});
```

## AdminGetOwnedMediaSlot
You can execute the `AdminGetOwnedMediaSlot` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedMediaSlot(vars: AdminGetOwnedMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;

interface AdminGetOwnedMediaSlotRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedMediaSlotVariables): QueryRef<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;
}
export const adminGetOwnedMediaSlotRef: AdminGetOwnedMediaSlotRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedMediaSlot(dc: DataConnect, vars: AdminGetOwnedMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;

interface AdminGetOwnedMediaSlotRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedMediaSlotVariables): QueryRef<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;
}
export const adminGetOwnedMediaSlotRef: AdminGetOwnedMediaSlotRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedMediaSlotRef:
```typescript
const name = adminGetOwnedMediaSlotRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedMediaSlot` query requires an argument of type `AdminGetOwnedMediaSlotVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedMediaSlotVariables {
  ownerUid: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
}
```
### Return Type
Recall that executing the `AdminGetOwnedMediaSlot` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedMediaSlotData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedMediaSlotData {
  mediaSlot?: {
    ownerUid: string;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    targetKind: string;
    targetKey: string;
    purpose: string;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
    currentAsset: {
      id: UUIDString;
      assetType: MediaAssetType;
      purpose: string;
      status: MediaAssetStatus;
      bucket: string;
      objectKey: string;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    } & MediaAsset_Key;
  } & MediaSlot_Key;
}
```
### Using `AdminGetOwnedMediaSlot`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedMediaSlot, AdminGetOwnedMediaSlotVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedMediaSlot` query requires an argument of type `AdminGetOwnedMediaSlotVariables`:
const adminGetOwnedMediaSlotVars: AdminGetOwnedMediaSlotVariables = {
  ownerUid: ..., 
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
};

// Call the `adminGetOwnedMediaSlot()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedMediaSlot(adminGetOwnedMediaSlotVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedMediaSlot({ ownerUid: ..., targetKind: ..., targetKey: ..., purpose: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedMediaSlot(dataConnect, adminGetOwnedMediaSlotVars);

console.log(data.mediaSlot);

// Or, you can use the `Promise` API.
adminGetOwnedMediaSlot(adminGetOwnedMediaSlotVars).then((response) => {
  const data = response.data;
  console.log(data.mediaSlot);
});
```

### Using `AdminGetOwnedMediaSlot`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedMediaSlotRef, AdminGetOwnedMediaSlotVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedMediaSlot` query requires an argument of type `AdminGetOwnedMediaSlotVariables`:
const adminGetOwnedMediaSlotVars: AdminGetOwnedMediaSlotVariables = {
  ownerUid: ..., 
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
};

// Call the `adminGetOwnedMediaSlotRef()` function to get a reference to the query.
const ref = adminGetOwnedMediaSlotRef(adminGetOwnedMediaSlotVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedMediaSlotRef({ ownerUid: ..., targetKind: ..., targetKey: ..., purpose: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedMediaSlotRef(dataConnect, adminGetOwnedMediaSlotVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaSlot);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaSlot);
});
```

## AdminListOwnedMediaSlotHistory
You can execute the `AdminListOwnedMediaSlotHistory` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListOwnedMediaSlotHistory(vars: AdminListOwnedMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;

interface AdminListOwnedMediaSlotHistoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedMediaSlotHistoryVariables): QueryRef<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;
}
export const adminListOwnedMediaSlotHistoryRef: AdminListOwnedMediaSlotHistoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListOwnedMediaSlotHistory(dc: DataConnect, vars: AdminListOwnedMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;

interface AdminListOwnedMediaSlotHistoryRef {
  ...
  (dc: DataConnect, vars: AdminListOwnedMediaSlotHistoryVariables): QueryRef<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;
}
export const adminListOwnedMediaSlotHistoryRef: AdminListOwnedMediaSlotHistoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListOwnedMediaSlotHistoryRef:
```typescript
const name = adminListOwnedMediaSlotHistoryRef.operationName;
console.log(name);
```

### Variables
The `AdminListOwnedMediaSlotHistory` query requires an argument of type `AdminListOwnedMediaSlotHistoryVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListOwnedMediaSlotHistoryVariables {
  ownerUid: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListOwnedMediaSlotHistory` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListOwnedMediaSlotHistoryData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListOwnedMediaSlotHistoryData {
  mediaAttachments: ({
    id: UUIDString;
    assetId: UUIDString;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    historyEntityType?: string | null;
    clientHistoryId?: string | null;
    promptUsed?: string | null;
    chapterNumber?: number | null;
    arcTitle?: string | null;
    label?: string | null;
    position: number;
    isCurrent: boolean;
    createdAt: TimestampString;
    endedAt?: TimestampString | null;
    asset: {
      id: UUIDString;
      assetType: MediaAssetType;
      purpose: string;
      status: MediaAssetStatus;
      bucket: string;
      objectKey: string;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    } & MediaAsset_Key;
  } & MediaAttachment_Key)[];
}
```
### Using `AdminListOwnedMediaSlotHistory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedMediaSlotHistory, AdminListOwnedMediaSlotHistoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedMediaSlotHistory` query requires an argument of type `AdminListOwnedMediaSlotHistoryVariables`:
const adminListOwnedMediaSlotHistoryVars: AdminListOwnedMediaSlotHistoryVariables = {
  ownerUid: ..., 
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  limit: ..., // optional
};

// Call the `adminListOwnedMediaSlotHistory()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListOwnedMediaSlotHistory(adminListOwnedMediaSlotHistoryVars);
// Variables can be defined inline as well.
const { data } = await adminListOwnedMediaSlotHistory({ ownerUid: ..., targetKind: ..., targetKey: ..., purpose: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListOwnedMediaSlotHistory(dataConnect, adminListOwnedMediaSlotHistoryVars);

console.log(data.mediaAttachments);

// Or, you can use the `Promise` API.
adminListOwnedMediaSlotHistory(adminListOwnedMediaSlotHistoryVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachments);
});
```

### Using `AdminListOwnedMediaSlotHistory`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedMediaSlotHistoryRef, AdminListOwnedMediaSlotHistoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedMediaSlotHistory` query requires an argument of type `AdminListOwnedMediaSlotHistoryVariables`:
const adminListOwnedMediaSlotHistoryVars: AdminListOwnedMediaSlotHistoryVariables = {
  ownerUid: ..., 
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  limit: ..., // optional
};

// Call the `adminListOwnedMediaSlotHistoryRef()` function to get a reference to the query.
const ref = adminListOwnedMediaSlotHistoryRef(adminListOwnedMediaSlotHistoryVars);
// Variables can be defined inline as well.
const ref = adminListOwnedMediaSlotHistoryRef({ ownerUid: ..., targetKind: ..., targetKey: ..., purpose: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListOwnedMediaSlotHistoryRef(dataConnect, adminListOwnedMediaSlotHistoryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAttachments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachments);
});
```

## AdminGetMediaUploadReceipt
You can execute the `AdminGetMediaUploadReceipt` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetMediaUploadReceipt(vars: AdminGetMediaUploadReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;

interface AdminGetMediaUploadReceiptRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetMediaUploadReceiptVariables): QueryRef<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;
}
export const adminGetMediaUploadReceiptRef: AdminGetMediaUploadReceiptRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetMediaUploadReceipt(dc: DataConnect, vars: AdminGetMediaUploadReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;

interface AdminGetMediaUploadReceiptRef {
  ...
  (dc: DataConnect, vars: AdminGetMediaUploadReceiptVariables): QueryRef<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;
}
export const adminGetMediaUploadReceiptRef: AdminGetMediaUploadReceiptRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetMediaUploadReceiptRef:
```typescript
const name = adminGetMediaUploadReceiptRef.operationName;
console.log(name);
```

### Variables
The `AdminGetMediaUploadReceipt` query requires an argument of type `AdminGetMediaUploadReceiptVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetMediaUploadReceiptVariables {
  ownerUid: string;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminGetMediaUploadReceipt` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetMediaUploadReceiptData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetMediaUploadReceiptData {
  mediaUploadReceipt?: {
    ownerUid: string;
    idempotencyKey: string;
    assetId: UUIDString;
    requestHash: string;
    status: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & MediaUploadReceipt_Key;
}
```
### Using `AdminGetMediaUploadReceipt`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetMediaUploadReceipt, AdminGetMediaUploadReceiptVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetMediaUploadReceipt` query requires an argument of type `AdminGetMediaUploadReceiptVariables`:
const adminGetMediaUploadReceiptVars: AdminGetMediaUploadReceiptVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetMediaUploadReceipt()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetMediaUploadReceipt(adminGetMediaUploadReceiptVars);
// Variables can be defined inline as well.
const { data } = await adminGetMediaUploadReceipt({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetMediaUploadReceipt(dataConnect, adminGetMediaUploadReceiptVars);

console.log(data.mediaUploadReceipt);

// Or, you can use the `Promise` API.
adminGetMediaUploadReceipt(adminGetMediaUploadReceiptVars).then((response) => {
  const data = response.data;
  console.log(data.mediaUploadReceipt);
});
```

### Using `AdminGetMediaUploadReceipt`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetMediaUploadReceiptRef, AdminGetMediaUploadReceiptVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetMediaUploadReceipt` query requires an argument of type `AdminGetMediaUploadReceiptVariables`:
const adminGetMediaUploadReceiptVars: AdminGetMediaUploadReceiptVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetMediaUploadReceiptRef()` function to get a reference to the query.
const ref = adminGetMediaUploadReceiptRef(adminGetMediaUploadReceiptVars);
// Variables can be defined inline as well.
const ref = adminGetMediaUploadReceiptRef({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetMediaUploadReceiptRef(dataConnect, adminGetMediaUploadReceiptVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaUploadReceipt);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaUploadReceipt);
});
```

## AdminGetOwnedStorageQuotaReservation
You can execute the `AdminGetOwnedStorageQuotaReservation` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedStorageQuotaReservation(vars: AdminGetOwnedStorageQuotaReservationVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;

interface AdminGetOwnedStorageQuotaReservationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStorageQuotaReservationVariables): QueryRef<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;
}
export const adminGetOwnedStorageQuotaReservationRef: AdminGetOwnedStorageQuotaReservationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedStorageQuotaReservation(dc: DataConnect, vars: AdminGetOwnedStorageQuotaReservationVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;

interface AdminGetOwnedStorageQuotaReservationRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedStorageQuotaReservationVariables): QueryRef<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;
}
export const adminGetOwnedStorageQuotaReservationRef: AdminGetOwnedStorageQuotaReservationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedStorageQuotaReservationRef:
```typescript
const name = adminGetOwnedStorageQuotaReservationRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedStorageQuotaReservation` query requires an argument of type `AdminGetOwnedStorageQuotaReservationVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedStorageQuotaReservationVariables {
  ownerUid: string;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminGetOwnedStorageQuotaReservation` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedStorageQuotaReservationData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedStorageQuotaReservationData {
  storageQuotaReservation?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetId?: UUIDString | null;
    idempotencyKey: string;
    requestedBytes: Int64String;
    status: StorageQuotaReservationStatus;
    expiresAt: TimestampString;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
  } & StorageQuotaReservation_Key;
}
```
### Using `AdminGetOwnedStorageQuotaReservation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStorageQuotaReservation, AdminGetOwnedStorageQuotaReservationVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStorageQuotaReservation` query requires an argument of type `AdminGetOwnedStorageQuotaReservationVariables`:
const adminGetOwnedStorageQuotaReservationVars: AdminGetOwnedStorageQuotaReservationVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetOwnedStorageQuotaReservation()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedStorageQuotaReservation(adminGetOwnedStorageQuotaReservationVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedStorageQuotaReservation({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedStorageQuotaReservation(dataConnect, adminGetOwnedStorageQuotaReservationVars);

console.log(data.storageQuotaReservation);

// Or, you can use the `Promise` API.
adminGetOwnedStorageQuotaReservation(adminGetOwnedStorageQuotaReservationVars).then((response) => {
  const data = response.data;
  console.log(data.storageQuotaReservation);
});
```

### Using `AdminGetOwnedStorageQuotaReservation`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedStorageQuotaReservationRef, AdminGetOwnedStorageQuotaReservationVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedStorageQuotaReservation` query requires an argument of type `AdminGetOwnedStorageQuotaReservationVariables`:
const adminGetOwnedStorageQuotaReservationVars: AdminGetOwnedStorageQuotaReservationVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetOwnedStorageQuotaReservationRef()` function to get a reference to the query.
const ref = adminGetOwnedStorageQuotaReservationRef(adminGetOwnedStorageQuotaReservationVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedStorageQuotaReservationRef({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedStorageQuotaReservationRef(dataConnect, adminGetOwnedStorageQuotaReservationVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.storageQuotaReservation);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.storageQuotaReservation);
});
```

## AdminGetMediaDeletionIntent
You can execute the `AdminGetMediaDeletionIntent` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetMediaDeletionIntent(vars: AdminGetMediaDeletionIntentVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;

interface AdminGetMediaDeletionIntentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetMediaDeletionIntentVariables): QueryRef<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;
}
export const adminGetMediaDeletionIntentRef: AdminGetMediaDeletionIntentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetMediaDeletionIntent(dc: DataConnect, vars: AdminGetMediaDeletionIntentVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;

interface AdminGetMediaDeletionIntentRef {
  ...
  (dc: DataConnect, vars: AdminGetMediaDeletionIntentVariables): QueryRef<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;
}
export const adminGetMediaDeletionIntentRef: AdminGetMediaDeletionIntentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetMediaDeletionIntentRef:
```typescript
const name = adminGetMediaDeletionIntentRef.operationName;
console.log(name);
```

### Variables
The `AdminGetMediaDeletionIntent` query requires an argument of type `AdminGetMediaDeletionIntentVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetMediaDeletionIntentVariables {
  ownerUid: string;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminGetMediaDeletionIntent` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetMediaDeletionIntentData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetMediaDeletionIntentData {
  mediaDeletionIntent?: {
    ownerUid: string;
    idempotencyKey: string;
    assetId: UUIDString;
    storyId?: UUIDString | null;
    reason: string;
    status: MediaDeletionIntentStatus;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
    lastError?: string | null;
  } & MediaDeletionIntent_Key;
}
```
### Using `AdminGetMediaDeletionIntent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetMediaDeletionIntent, AdminGetMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetMediaDeletionIntent` query requires an argument of type `AdminGetMediaDeletionIntentVariables`:
const adminGetMediaDeletionIntentVars: AdminGetMediaDeletionIntentVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetMediaDeletionIntent()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetMediaDeletionIntent(adminGetMediaDeletionIntentVars);
// Variables can be defined inline as well.
const { data } = await adminGetMediaDeletionIntent({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetMediaDeletionIntent(dataConnect, adminGetMediaDeletionIntentVars);

console.log(data.mediaDeletionIntent);

// Or, you can use the `Promise` API.
adminGetMediaDeletionIntent(adminGetMediaDeletionIntentVars).then((response) => {
  const data = response.data;
  console.log(data.mediaDeletionIntent);
});
```

### Using `AdminGetMediaDeletionIntent`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetMediaDeletionIntentRef, AdminGetMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetMediaDeletionIntent` query requires an argument of type `AdminGetMediaDeletionIntentVariables`:
const adminGetMediaDeletionIntentVars: AdminGetMediaDeletionIntentVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetMediaDeletionIntentRef()` function to get a reference to the query.
const ref = adminGetMediaDeletionIntentRef(adminGetMediaDeletionIntentVars);
// Variables can be defined inline as well.
const ref = adminGetMediaDeletionIntentRef({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetMediaDeletionIntentRef(dataConnect, adminGetMediaDeletionIntentVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaDeletionIntent);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaDeletionIntent);
});
```

## AdminListStoryDeletionMediaCandidates
You can execute the `AdminListStoryDeletionMediaCandidates` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListStoryDeletionMediaCandidates(vars: AdminListStoryDeletionMediaCandidatesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;

interface AdminListStoryDeletionMediaCandidatesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListStoryDeletionMediaCandidatesVariables): QueryRef<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;
}
export const adminListStoryDeletionMediaCandidatesRef: AdminListStoryDeletionMediaCandidatesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListStoryDeletionMediaCandidates(dc: DataConnect, vars: AdminListStoryDeletionMediaCandidatesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;

interface AdminListStoryDeletionMediaCandidatesRef {
  ...
  (dc: DataConnect, vars: AdminListStoryDeletionMediaCandidatesVariables): QueryRef<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;
}
export const adminListStoryDeletionMediaCandidatesRef: AdminListStoryDeletionMediaCandidatesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListStoryDeletionMediaCandidatesRef:
```typescript
const name = adminListStoryDeletionMediaCandidatesRef.operationName;
console.log(name);
```

### Variables
The `AdminListStoryDeletionMediaCandidates` query requires an argument of type `AdminListStoryDeletionMediaCandidatesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListStoryDeletionMediaCandidatesVariables {
  ownerUid: string;
  storyId: UUIDString;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListStoryDeletionMediaCandidates` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListStoryDeletionMediaCandidatesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListStoryDeletionMediaCandidatesData {
  mediaAssets: ({
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    byteSize: Int64String;
    checksumSha256: string;
    cleanupAfter?: TimestampString | null;
    attachments: ({
      id: UUIDString;
      storyId?: UUIDString | null;
      chapterId?: UUIDString | null;
      entityId?: UUIDString | null;
      targetKind: string;
      targetKey: string;
      purpose: string;
      isCurrent: boolean;
    } & MediaAttachment_Key)[];
  } & MediaAsset_Key)[];
}
```
### Using `AdminListStoryDeletionMediaCandidates`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListStoryDeletionMediaCandidates, AdminListStoryDeletionMediaCandidatesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListStoryDeletionMediaCandidates` query requires an argument of type `AdminListStoryDeletionMediaCandidatesVariables`:
const adminListStoryDeletionMediaCandidatesVars: AdminListStoryDeletionMediaCandidatesVariables = {
  ownerUid: ..., 
  storyId: ..., 
  limit: ..., // optional
};

// Call the `adminListStoryDeletionMediaCandidates()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListStoryDeletionMediaCandidates(adminListStoryDeletionMediaCandidatesVars);
// Variables can be defined inline as well.
const { data } = await adminListStoryDeletionMediaCandidates({ ownerUid: ..., storyId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListStoryDeletionMediaCandidates(dataConnect, adminListStoryDeletionMediaCandidatesVars);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
adminListStoryDeletionMediaCandidates(adminListStoryDeletionMediaCandidatesVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

### Using `AdminListStoryDeletionMediaCandidates`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListStoryDeletionMediaCandidatesRef, AdminListStoryDeletionMediaCandidatesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListStoryDeletionMediaCandidates` query requires an argument of type `AdminListStoryDeletionMediaCandidatesVariables`:
const adminListStoryDeletionMediaCandidatesVars: AdminListStoryDeletionMediaCandidatesVariables = {
  ownerUid: ..., 
  storyId: ..., 
  limit: ..., // optional
};

// Call the `adminListStoryDeletionMediaCandidatesRef()` function to get a reference to the query.
const ref = adminListStoryDeletionMediaCandidatesRef(adminListStoryDeletionMediaCandidatesVars);
// Variables can be defined inline as well.
const ref = adminListStoryDeletionMediaCandidatesRef({ ownerUid: ..., storyId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListStoryDeletionMediaCandidatesRef(dataConnect, adminListStoryDeletionMediaCandidatesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mediaAssets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAssets);
});
```

## AdminListStoryDeletionJobs
You can execute the `AdminListStoryDeletionJobs` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListStoryDeletionJobs(vars?: AdminListStoryDeletionJobsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;

interface AdminListStoryDeletionJobsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: AdminListStoryDeletionJobsVariables): QueryRef<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;
}
export const adminListStoryDeletionJobsRef: AdminListStoryDeletionJobsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListStoryDeletionJobs(dc: DataConnect, vars?: AdminListStoryDeletionJobsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;

interface AdminListStoryDeletionJobsRef {
  ...
  (dc: DataConnect, vars?: AdminListStoryDeletionJobsVariables): QueryRef<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;
}
export const adminListStoryDeletionJobsRef: AdminListStoryDeletionJobsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListStoryDeletionJobsRef:
```typescript
const name = adminListStoryDeletionJobsRef.operationName;
console.log(name);
```

### Variables
The `AdminListStoryDeletionJobs` query has an optional argument of type `AdminListStoryDeletionJobsVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListStoryDeletionJobsVariables {
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListStoryDeletionJobs` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListStoryDeletionJobsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListStoryDeletionJobsData {
  storyDeletionJobs: ({
    id: UUIDString;
    ownerUid: string;
    storyId: UUIDString;
    idempotencyKey: string;
    status: StoryDeletionStatus;
    currentStage: StoryDeletionStageKind;
    leaseOwner?: string | null;
    leaseExpiresAt?: TimestampString | null;
    attemptCount: number;
    lastError?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & StoryDeletionJob_Key)[];
}
```
### Using `AdminListStoryDeletionJobs`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListStoryDeletionJobs, AdminListStoryDeletionJobsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListStoryDeletionJobs` query has an optional argument of type `AdminListStoryDeletionJobsVariables`:
const adminListStoryDeletionJobsVars: AdminListStoryDeletionJobsVariables = {
  limit: ..., // optional
};

// Call the `adminListStoryDeletionJobs()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListStoryDeletionJobs(adminListStoryDeletionJobsVars);
// Variables can be defined inline as well.
const { data } = await adminListStoryDeletionJobs({ limit: ..., });
// Since all variables are optional for this query, you can omit the `AdminListStoryDeletionJobsVariables` argument.
const { data } = await adminListStoryDeletionJobs();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListStoryDeletionJobs(dataConnect, adminListStoryDeletionJobsVars);

console.log(data.storyDeletionJobs);

// Or, you can use the `Promise` API.
adminListStoryDeletionJobs(adminListStoryDeletionJobsVars).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionJobs);
});
```

### Using `AdminListStoryDeletionJobs`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListStoryDeletionJobsRef, AdminListStoryDeletionJobsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListStoryDeletionJobs` query has an optional argument of type `AdminListStoryDeletionJobsVariables`:
const adminListStoryDeletionJobsVars: AdminListStoryDeletionJobsVariables = {
  limit: ..., // optional
};

// Call the `adminListStoryDeletionJobsRef()` function to get a reference to the query.
const ref = adminListStoryDeletionJobsRef(adminListStoryDeletionJobsVars);
// Variables can be defined inline as well.
const ref = adminListStoryDeletionJobsRef({ limit: ..., });
// Since all variables are optional for this query, you can omit the `AdminListStoryDeletionJobsVariables` argument.
const ref = adminListStoryDeletionJobsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListStoryDeletionJobsRef(dataConnect, adminListStoryDeletionJobsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.storyDeletionJobs);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionJobs);
});
```

## AdminListExpiredStoryTombstones
You can execute the `AdminListExpiredStoryTombstones` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListExpiredStoryTombstones(vars: AdminListExpiredStoryTombstonesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;

interface AdminListExpiredStoryTombstonesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListExpiredStoryTombstonesVariables): QueryRef<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;
}
export const adminListExpiredStoryTombstonesRef: AdminListExpiredStoryTombstonesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListExpiredStoryTombstones(dc: DataConnect, vars: AdminListExpiredStoryTombstonesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;

interface AdminListExpiredStoryTombstonesRef {
  ...
  (dc: DataConnect, vars: AdminListExpiredStoryTombstonesVariables): QueryRef<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;
}
export const adminListExpiredStoryTombstonesRef: AdminListExpiredStoryTombstonesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListExpiredStoryTombstonesRef:
```typescript
const name = adminListExpiredStoryTombstonesRef.operationName;
console.log(name);
```

### Variables
The `AdminListExpiredStoryTombstones` query requires an argument of type `AdminListExpiredStoryTombstonesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListExpiredStoryTombstonesVariables {
  completedBefore: TimestampString;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListExpiredStoryTombstones` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListExpiredStoryTombstonesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListExpiredStoryTombstonesData {
  storyDeletionJobs: ({
    id: UUIDString;
    ownerUid: string;
    storyId: UUIDString;
    idempotencyKey: string;
    status: StoryDeletionStatus;
    currentStage: StoryDeletionStageKind;
    attemptCount: number;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
  } & StoryDeletionJob_Key)[];
}
```
### Using `AdminListExpiredStoryTombstones`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListExpiredStoryTombstones, AdminListExpiredStoryTombstonesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListExpiredStoryTombstones` query requires an argument of type `AdminListExpiredStoryTombstonesVariables`:
const adminListExpiredStoryTombstonesVars: AdminListExpiredStoryTombstonesVariables = {
  completedBefore: ..., 
  limit: ..., // optional
};

// Call the `adminListExpiredStoryTombstones()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListExpiredStoryTombstones(adminListExpiredStoryTombstonesVars);
// Variables can be defined inline as well.
const { data } = await adminListExpiredStoryTombstones({ completedBefore: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListExpiredStoryTombstones(dataConnect, adminListExpiredStoryTombstonesVars);

console.log(data.storyDeletionJobs);

// Or, you can use the `Promise` API.
adminListExpiredStoryTombstones(adminListExpiredStoryTombstonesVars).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionJobs);
});
```

### Using `AdminListExpiredStoryTombstones`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListExpiredStoryTombstonesRef, AdminListExpiredStoryTombstonesVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListExpiredStoryTombstones` query requires an argument of type `AdminListExpiredStoryTombstonesVariables`:
const adminListExpiredStoryTombstonesVars: AdminListExpiredStoryTombstonesVariables = {
  completedBefore: ..., 
  limit: ..., // optional
};

// Call the `adminListExpiredStoryTombstonesRef()` function to get a reference to the query.
const ref = adminListExpiredStoryTombstonesRef(adminListExpiredStoryTombstonesVars);
// Variables can be defined inline as well.
const ref = adminListExpiredStoryTombstonesRef({ completedBefore: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListExpiredStoryTombstonesRef(dataConnect, adminListExpiredStoryTombstonesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.storyDeletionJobs);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionJobs);
});
```

## AdminGetStorageUsageReport
You can execute the `AdminGetStorageUsageReport` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetStorageUsageReport(options?: ExecuteQueryOptions): QueryPromise<AdminGetStorageUsageReportData, undefined>;

interface AdminGetStorageUsageReportRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<AdminGetStorageUsageReportData, undefined>;
}
export const adminGetStorageUsageReportRef: AdminGetStorageUsageReportRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetStorageUsageReport(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<AdminGetStorageUsageReportData, undefined>;

interface AdminGetStorageUsageReportRef {
  ...
  (dc: DataConnect): QueryRef<AdminGetStorageUsageReportData, undefined>;
}
export const adminGetStorageUsageReportRef: AdminGetStorageUsageReportRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetStorageUsageReportRef:
```typescript
const name = adminGetStorageUsageReportRef.operationName;
console.log(name);
```

### Variables
The `AdminGetStorageUsageReport` query has no variables.
### Return Type
Recall that executing the `AdminGetStorageUsageReport` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetStorageUsageReportData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetStorageUsageReportData {
  totals?: unknown | null;
  byUser?: unknown[] | null;
  byStory?: unknown[] | null;
  byType?: unknown[] | null;
}
```
### Using `AdminGetStorageUsageReport`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetStorageUsageReport } from '@seihouse/celestial-library-dataconnect';


// Call the `adminGetStorageUsageReport()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetStorageUsageReport();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetStorageUsageReport(dataConnect);

console.log(data.totals);
console.log(data.byUser);
console.log(data.byStory);
console.log(data.byType);

// Or, you can use the `Promise` API.
adminGetStorageUsageReport().then((response) => {
  const data = response.data;
  console.log(data.totals);
  console.log(data.byUser);
  console.log(data.byStory);
  console.log(data.byType);
});
```

### Using `AdminGetStorageUsageReport`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetStorageUsageReportRef } from '@seihouse/celestial-library-dataconnect';


// Call the `adminGetStorageUsageReportRef()` function to get a reference to the query.
const ref = adminGetStorageUsageReportRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetStorageUsageReportRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.totals);
console.log(data.byUser);
console.log(data.byStory);
console.log(data.byType);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.totals);
  console.log(data.byUser);
  console.log(data.byStory);
  console.log(data.byType);
});
```

## AdminListOwnedGlossaryTerms
You can execute the `AdminListOwnedGlossaryTerms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminListOwnedGlossaryTerms(vars: AdminListOwnedGlossaryTermsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;

interface AdminListOwnedGlossaryTermsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedGlossaryTermsVariables): QueryRef<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;
}
export const adminListOwnedGlossaryTermsRef: AdminListOwnedGlossaryTermsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminListOwnedGlossaryTerms(dc: DataConnect, vars: AdminListOwnedGlossaryTermsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;

interface AdminListOwnedGlossaryTermsRef {
  ...
  (dc: DataConnect, vars: AdminListOwnedGlossaryTermsVariables): QueryRef<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;
}
export const adminListOwnedGlossaryTermsRef: AdminListOwnedGlossaryTermsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminListOwnedGlossaryTermsRef:
```typescript
const name = adminListOwnedGlossaryTermsRef.operationName;
console.log(name);
```

### Variables
The `AdminListOwnedGlossaryTerms` query requires an argument of type `AdminListOwnedGlossaryTermsVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminListOwnedGlossaryTermsVariables {
  ownerUid: string;
  storyId: UUIDString;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminListOwnedGlossaryTerms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminListOwnedGlossaryTermsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminListOwnedGlossaryTermsData {
  glossaryTerms: ({
    id: UUIDString;
    storyId: UUIDString;
    sourceText: string;
    targetText: string;
    targetLanguage: string;
    note?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & GlossaryTerm_Key)[];
}
```
### Using `AdminListOwnedGlossaryTerms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedGlossaryTerms, AdminListOwnedGlossaryTermsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedGlossaryTerms` query requires an argument of type `AdminListOwnedGlossaryTermsVariables`:
const adminListOwnedGlossaryTermsVars: AdminListOwnedGlossaryTermsVariables = {
  ownerUid: ..., 
  storyId: ..., 
  limit: ..., // optional
};

// Call the `adminListOwnedGlossaryTerms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminListOwnedGlossaryTerms(adminListOwnedGlossaryTermsVars);
// Variables can be defined inline as well.
const { data } = await adminListOwnedGlossaryTerms({ ownerUid: ..., storyId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminListOwnedGlossaryTerms(dataConnect, adminListOwnedGlossaryTermsVars);

console.log(data.glossaryTerms);

// Or, you can use the `Promise` API.
adminListOwnedGlossaryTerms(adminListOwnedGlossaryTermsVars).then((response) => {
  const data = response.data;
  console.log(data.glossaryTerms);
});
```

### Using `AdminListOwnedGlossaryTerms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminListOwnedGlossaryTermsRef, AdminListOwnedGlossaryTermsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminListOwnedGlossaryTerms` query requires an argument of type `AdminListOwnedGlossaryTermsVariables`:
const adminListOwnedGlossaryTermsVars: AdminListOwnedGlossaryTermsVariables = {
  ownerUid: ..., 
  storyId: ..., 
  limit: ..., // optional
};

// Call the `adminListOwnedGlossaryTermsRef()` function to get a reference to the query.
const ref = adminListOwnedGlossaryTermsRef(adminListOwnedGlossaryTermsVars);
// Variables can be defined inline as well.
const ref = adminListOwnedGlossaryTermsRef({ ownerUid: ..., storyId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminListOwnedGlossaryTermsRef(dataConnect, adminListOwnedGlossaryTermsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.glossaryTerms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.glossaryTerms);
});
```

## AdminGetImageQuotaConsumption
You can execute the `AdminGetImageQuotaConsumption` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetImageQuotaConsumption(vars: AdminGetImageQuotaConsumptionVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;

interface AdminGetImageQuotaConsumptionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetImageQuotaConsumptionVariables): QueryRef<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;
}
export const adminGetImageQuotaConsumptionRef: AdminGetImageQuotaConsumptionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetImageQuotaConsumption(dc: DataConnect, vars: AdminGetImageQuotaConsumptionVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;

interface AdminGetImageQuotaConsumptionRef {
  ...
  (dc: DataConnect, vars: AdminGetImageQuotaConsumptionVariables): QueryRef<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;
}
export const adminGetImageQuotaConsumptionRef: AdminGetImageQuotaConsumptionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetImageQuotaConsumptionRef:
```typescript
const name = adminGetImageQuotaConsumptionRef.operationName;
console.log(name);
```

### Variables
The `AdminGetImageQuotaConsumption` query requires an argument of type `AdminGetImageQuotaConsumptionVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetImageQuotaConsumptionVariables {
  ownerUid: string;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminGetImageQuotaConsumption` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetImageQuotaConsumptionData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetImageQuotaConsumptionData {
  imageQuotaConsumption?: {
    ownerUid: string;
    idempotencyKey: string;
    imageGenerationCount: number;
    imageQuotaResetAt: TimestampString;
    consumedAt: TimestampString;
  } & ImageQuotaConsumption_Key;
}
```
### Using `AdminGetImageQuotaConsumption`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetImageQuotaConsumption, AdminGetImageQuotaConsumptionVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetImageQuotaConsumption` query requires an argument of type `AdminGetImageQuotaConsumptionVariables`:
const adminGetImageQuotaConsumptionVars: AdminGetImageQuotaConsumptionVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetImageQuotaConsumption()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetImageQuotaConsumption(adminGetImageQuotaConsumptionVars);
// Variables can be defined inline as well.
const { data } = await adminGetImageQuotaConsumption({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetImageQuotaConsumption(dataConnect, adminGetImageQuotaConsumptionVars);

console.log(data.imageQuotaConsumption);

// Or, you can use the `Promise` API.
adminGetImageQuotaConsumption(adminGetImageQuotaConsumptionVars).then((response) => {
  const data = response.data;
  console.log(data.imageQuotaConsumption);
});
```

### Using `AdminGetImageQuotaConsumption`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetImageQuotaConsumptionRef, AdminGetImageQuotaConsumptionVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetImageQuotaConsumption` query requires an argument of type `AdminGetImageQuotaConsumptionVariables`:
const adminGetImageQuotaConsumptionVars: AdminGetImageQuotaConsumptionVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminGetImageQuotaConsumptionRef()` function to get a reference to the query.
const ref = adminGetImageQuotaConsumptionRef(adminGetImageQuotaConsumptionVars);
// Variables can be defined inline as well.
const ref = adminGetImageQuotaConsumptionRef({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetImageQuotaConsumptionRef(dataConnect, adminGetImageQuotaConsumptionVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.imageQuotaConsumption);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.imageQuotaConsumption);
});
```

## AdminGetOwnedPortraitAsset
You can execute the `AdminGetOwnedPortraitAsset` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetOwnedPortraitAsset(vars: AdminGetOwnedPortraitAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;

interface AdminGetOwnedPortraitAssetRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedPortraitAssetVariables): QueryRef<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;
}
export const adminGetOwnedPortraitAssetRef: AdminGetOwnedPortraitAssetRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetOwnedPortraitAsset(dc: DataConnect, vars: AdminGetOwnedPortraitAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;

interface AdminGetOwnedPortraitAssetRef {
  ...
  (dc: DataConnect, vars: AdminGetOwnedPortraitAssetVariables): QueryRef<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;
}
export const adminGetOwnedPortraitAssetRef: AdminGetOwnedPortraitAssetRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetOwnedPortraitAssetRef:
```typescript
const name = adminGetOwnedPortraitAssetRef.operationName;
console.log(name);
```

### Variables
The `AdminGetOwnedPortraitAsset` query requires an argument of type `AdminGetOwnedPortraitAssetVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetOwnedPortraitAssetVariables {
  ownerUid: string;
  assetId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminGetOwnedPortraitAsset` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetOwnedPortraitAssetData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetOwnedPortraitAssetData {
  asset?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    version: number;
    readyAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & MediaAsset_Key;
  portrait?: {
    assetId: UUIDString;
    userUid: string;
    prompt?: string | null;
    description?: string | null;
    daoRank?: string | null;
    daoXp?: Int64String | null;
    powerStage?: string | null;
    equippedInventoryItemId?: UUIDString | null;
    usedReferenceImage: boolean;
    frameId?: string | null;
    glowId?: string | null;
    bannerId?: string | null;
    effectIds?: string[] | null;
    active: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserPortrait_Key;
}
```
### Using `AdminGetOwnedPortraitAsset`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedPortraitAsset, AdminGetOwnedPortraitAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedPortraitAsset` query requires an argument of type `AdminGetOwnedPortraitAssetVariables`:
const adminGetOwnedPortraitAssetVars: AdminGetOwnedPortraitAssetVariables = {
  ownerUid: ..., 
  assetId: ..., 
};

// Call the `adminGetOwnedPortraitAsset()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetOwnedPortraitAsset(adminGetOwnedPortraitAssetVars);
// Variables can be defined inline as well.
const { data } = await adminGetOwnedPortraitAsset({ ownerUid: ..., assetId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetOwnedPortraitAsset(dataConnect, adminGetOwnedPortraitAssetVars);

console.log(data.asset);
console.log(data.portrait);

// Or, you can use the `Promise` API.
adminGetOwnedPortraitAsset(adminGetOwnedPortraitAssetVars).then((response) => {
  const data = response.data;
  console.log(data.asset);
  console.log(data.portrait);
});
```

### Using `AdminGetOwnedPortraitAsset`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetOwnedPortraitAssetRef, AdminGetOwnedPortraitAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetOwnedPortraitAsset` query requires an argument of type `AdminGetOwnedPortraitAssetVariables`:
const adminGetOwnedPortraitAssetVars: AdminGetOwnedPortraitAssetVariables = {
  ownerUid: ..., 
  assetId: ..., 
};

// Call the `adminGetOwnedPortraitAssetRef()` function to get a reference to the query.
const ref = adminGetOwnedPortraitAssetRef(adminGetOwnedPortraitAssetVars);
// Variables can be defined inline as well.
const ref = adminGetOwnedPortraitAssetRef({ ownerUid: ..., assetId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetOwnedPortraitAssetRef(dataConnect, adminGetOwnedPortraitAssetVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.asset);
console.log(data.portrait);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.asset);
  console.log(data.portrait);
});
```

## AdminGetAdminOverview
You can execute the `AdminGetAdminOverview` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminGetAdminOverview(vars: AdminGetAdminOverviewVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;

interface AdminGetAdminOverviewRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetAdminOverviewVariables): QueryRef<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;
}
export const adminGetAdminOverviewRef: AdminGetAdminOverviewRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
adminGetAdminOverview(dc: DataConnect, vars: AdminGetAdminOverviewVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;

interface AdminGetAdminOverviewRef {
  ...
  (dc: DataConnect, vars: AdminGetAdminOverviewVariables): QueryRef<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;
}
export const adminGetAdminOverviewRef: AdminGetAdminOverviewRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminGetAdminOverviewRef:
```typescript
const name = adminGetAdminOverviewRef.operationName;
console.log(name);
```

### Variables
The `AdminGetAdminOverview` query requires an argument of type `AdminGetAdminOverviewVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminGetAdminOverviewVariables {
  actorUid: string;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `AdminGetAdminOverview` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminGetAdminOverviewData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminGetAdminOverviewData {
  actor?: {
    uid: string;
    role: AccountRole;
  } & UserAccount_Key;
  accounts: ({
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: AccountRole;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserAccount_Key)[];
  profiles: ({
    userUid: string;
    username?: string | null;
    subscriptionTier: SubscriptionTier;
    legacyQi?: Int64String | null;
    daoXp: Int64String;
    daoRank?: string | null;
    heavenlyQi: Int64String;
    sectQi: Int64String;
    demonicQi: Int64String;
    writingStreak: number;
    savedStoryCount: number;
    activePortraitAssetId?: UUIDString | null;
    imageGenerationCount: number;
    imageQuotaResetAt?: TimestampString | null;
    syncRevision?: string | null;
    revision: Int64String;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserProfile_Key)[];
  stories: ({
    id: UUIDString;
    ownerUid: string;
    legacyStoryId?: string | null;
    clientStoryId?: string | null;
    title: string;
    status: StoryStatus;
    syncRevision?: string | null;
    revision: Int64String;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key)[];
}
```
### Using `AdminGetAdminOverview`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminGetAdminOverview, AdminGetAdminOverviewVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetAdminOverview` query requires an argument of type `AdminGetAdminOverviewVariables`:
const adminGetAdminOverviewVars: AdminGetAdminOverviewVariables = {
  actorUid: ..., 
  limit: ..., // optional
};

// Call the `adminGetAdminOverview()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminGetAdminOverview(adminGetAdminOverviewVars);
// Variables can be defined inline as well.
const { data } = await adminGetAdminOverview({ actorUid: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminGetAdminOverview(dataConnect, adminGetAdminOverviewVars);

console.log(data.actor);
console.log(data.accounts);
console.log(data.profiles);
console.log(data.stories);

// Or, you can use the `Promise` API.
adminGetAdminOverview(adminGetAdminOverviewVars).then((response) => {
  const data = response.data;
  console.log(data.actor);
  console.log(data.accounts);
  console.log(data.profiles);
  console.log(data.stories);
});
```

### Using `AdminGetAdminOverview`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, adminGetAdminOverviewRef, AdminGetAdminOverviewVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminGetAdminOverview` query requires an argument of type `AdminGetAdminOverviewVariables`:
const adminGetAdminOverviewVars: AdminGetAdminOverviewVariables = {
  actorUid: ..., 
  limit: ..., // optional
};

// Call the `adminGetAdminOverviewRef()` function to get a reference to the query.
const ref = adminGetAdminOverviewRef(adminGetAdminOverviewVars);
// Variables can be defined inline as well.
const ref = adminGetAdminOverviewRef({ actorUid: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminGetAdminOverviewRef(dataConnect, adminGetAdminOverviewVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.actor);
console.log(data.accounts);
console.log(data.profiles);
console.log(data.stories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.actor);
  console.log(data.accounts);
  console.log(data.profiles);
  console.log(data.stories);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `celestial-library` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UpsertMyAccount
You can execute the `UpsertMyAccount` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
upsertMyAccount(): MutationPromise<UpsertMyAccountData, undefined>;

interface UpsertMyAccountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpsertMyAccountData, undefined>;
}
export const upsertMyAccountRef: UpsertMyAccountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertMyAccount(dc: DataConnect): MutationPromise<UpsertMyAccountData, undefined>;

interface UpsertMyAccountRef {
  ...
  (dc: DataConnect): MutationRef<UpsertMyAccountData, undefined>;
}
export const upsertMyAccountRef: UpsertMyAccountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertMyAccountRef:
```typescript
const name = upsertMyAccountRef.operationName;
console.log(name);
```

### Variables
The `UpsertMyAccount` mutation has no variables.
### Return Type
Recall that executing the `UpsertMyAccount` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertMyAccountData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertMyAccountData {
  userAccount_upsert: UserAccount_Key;
}
```
### Using `UpsertMyAccount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertMyAccount } from '@seihouse/celestial-library-dataconnect';


// Call the `upsertMyAccount()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertMyAccount();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertMyAccount(dataConnect);

console.log(data.userAccount_upsert);

// Or, you can use the `Promise` API.
upsertMyAccount().then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
});
```

### Using `UpsertMyAccount`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertMyAccountRef } from '@seihouse/celestial-library-dataconnect';


// Call the `upsertMyAccountRef()` function to get a reference to the mutation.
const ref = upsertMyAccountRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertMyAccountRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userAccount_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
});
```

## CreateFoundationProbe
You can execute the `CreateFoundationProbe` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createFoundationProbe(vars: CreateFoundationProbeVariables): MutationPromise<CreateFoundationProbeData, CreateFoundationProbeVariables>;

interface CreateFoundationProbeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateFoundationProbeVariables): MutationRef<CreateFoundationProbeData, CreateFoundationProbeVariables>;
}
export const createFoundationProbeRef: CreateFoundationProbeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createFoundationProbe(dc: DataConnect, vars: CreateFoundationProbeVariables): MutationPromise<CreateFoundationProbeData, CreateFoundationProbeVariables>;

interface CreateFoundationProbeRef {
  ...
  (dc: DataConnect, vars: CreateFoundationProbeVariables): MutationRef<CreateFoundationProbeData, CreateFoundationProbeVariables>;
}
export const createFoundationProbeRef: CreateFoundationProbeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createFoundationProbeRef:
```typescript
const name = createFoundationProbeRef.operationName;
console.log(name);
```

### Variables
The `CreateFoundationProbe` mutation requires an argument of type `CreateFoundationProbeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateFoundationProbeVariables {
  label: string;
}
```
### Return Type
Recall that executing the `CreateFoundationProbe` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateFoundationProbeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateFoundationProbeData {
  userAccount_upsert: UserAccount_Key;
  foundationProbe_insert: FoundationProbe_Key;
}
```
### Using `CreateFoundationProbe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createFoundationProbe, CreateFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `CreateFoundationProbe` mutation requires an argument of type `CreateFoundationProbeVariables`:
const createFoundationProbeVars: CreateFoundationProbeVariables = {
  label: ..., 
};

// Call the `createFoundationProbe()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createFoundationProbe(createFoundationProbeVars);
// Variables can be defined inline as well.
const { data } = await createFoundationProbe({ label: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createFoundationProbe(dataConnect, createFoundationProbeVars);

console.log(data.userAccount_upsert);
console.log(data.foundationProbe_insert);

// Or, you can use the `Promise` API.
createFoundationProbe(createFoundationProbeVars).then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
  console.log(data.foundationProbe_insert);
});
```

### Using `CreateFoundationProbe`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createFoundationProbeRef, CreateFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `CreateFoundationProbe` mutation requires an argument of type `CreateFoundationProbeVariables`:
const createFoundationProbeVars: CreateFoundationProbeVariables = {
  label: ..., 
};

// Call the `createFoundationProbeRef()` function to get a reference to the mutation.
const ref = createFoundationProbeRef(createFoundationProbeVars);
// Variables can be defined inline as well.
const ref = createFoundationProbeRef({ label: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createFoundationProbeRef(dataConnect, createFoundationProbeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userAccount_upsert);
console.log(data.foundationProbe_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
  console.log(data.foundationProbe_insert);
});
```

## DeleteMyFoundationProbe
You can execute the `DeleteMyFoundationProbe` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deleteMyFoundationProbe(vars: DeleteMyFoundationProbeVariables): MutationPromise<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;

interface DeleteMyFoundationProbeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteMyFoundationProbeVariables): MutationRef<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;
}
export const deleteMyFoundationProbeRef: DeleteMyFoundationProbeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteMyFoundationProbe(dc: DataConnect, vars: DeleteMyFoundationProbeVariables): MutationPromise<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;

interface DeleteMyFoundationProbeRef {
  ...
  (dc: DataConnect, vars: DeleteMyFoundationProbeVariables): MutationRef<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;
}
export const deleteMyFoundationProbeRef: DeleteMyFoundationProbeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteMyFoundationProbeRef:
```typescript
const name = deleteMyFoundationProbeRef.operationName;
console.log(name);
```

### Variables
The `DeleteMyFoundationProbe` mutation requires an argument of type `DeleteMyFoundationProbeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteMyFoundationProbeVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteMyFoundationProbe` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteMyFoundationProbeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteMyFoundationProbeData {
  foundationProbe_delete?: FoundationProbe_Key | null;
}
```
### Using `DeleteMyFoundationProbe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteMyFoundationProbe, DeleteMyFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `DeleteMyFoundationProbe` mutation requires an argument of type `DeleteMyFoundationProbeVariables`:
const deleteMyFoundationProbeVars: DeleteMyFoundationProbeVariables = {
  id: ..., 
};

// Call the `deleteMyFoundationProbe()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteMyFoundationProbe(deleteMyFoundationProbeVars);
// Variables can be defined inline as well.
const { data } = await deleteMyFoundationProbe({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteMyFoundationProbe(dataConnect, deleteMyFoundationProbeVars);

console.log(data.foundationProbe_delete);

// Or, you can use the `Promise` API.
deleteMyFoundationProbe(deleteMyFoundationProbeVars).then((response) => {
  const data = response.data;
  console.log(data.foundationProbe_delete);
});
```

### Using `DeleteMyFoundationProbe`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteMyFoundationProbeRef, DeleteMyFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `DeleteMyFoundationProbe` mutation requires an argument of type `DeleteMyFoundationProbeVariables`:
const deleteMyFoundationProbeVars: DeleteMyFoundationProbeVariables = {
  id: ..., 
};

// Call the `deleteMyFoundationProbeRef()` function to get a reference to the mutation.
const ref = deleteMyFoundationProbeRef(deleteMyFoundationProbeVars);
// Variables can be defined inline as well.
const ref = deleteMyFoundationProbeRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteMyFoundationProbeRef(dataConnect, deleteMyFoundationProbeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.foundationProbe_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.foundationProbe_delete);
});
```

## CreateStoryWithFirstChapter
You can execute the `CreateStoryWithFirstChapter` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createStoryWithFirstChapter(vars: CreateStoryWithFirstChapterVariables): MutationPromise<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;

interface CreateStoryWithFirstChapterRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryWithFirstChapterVariables): MutationRef<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;
}
export const createStoryWithFirstChapterRef: CreateStoryWithFirstChapterRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createStoryWithFirstChapter(dc: DataConnect, vars: CreateStoryWithFirstChapterVariables): MutationPromise<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;

interface CreateStoryWithFirstChapterRef {
  ...
  (dc: DataConnect, vars: CreateStoryWithFirstChapterVariables): MutationRef<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;
}
export const createStoryWithFirstChapterRef: CreateStoryWithFirstChapterRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createStoryWithFirstChapterRef:
```typescript
const name = createStoryWithFirstChapterRef.operationName;
console.log(name);
```

### Variables
The `CreateStoryWithFirstChapter` mutation requires an argument of type `CreateStoryWithFirstChapterVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateStoryWithFirstChapterVariables {
  title: string;
  genre: string;
  mainCharacterName?: string | null;
  premise?: string | null;
  chapterTitle: string;
  chapterPremise?: string | null;
}
```
### Return Type
Recall that executing the `CreateStoryWithFirstChapter` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateStoryWithFirstChapterData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateStoryWithFirstChapterData {
  userAccount_upsert: UserAccount_Key;
  story_insert: Story_Key;
  storyMember_insert: StoryMember_Key;
  chapter_insert: Chapter_Key;
}
```
### Using `CreateStoryWithFirstChapter`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createStoryWithFirstChapter, CreateStoryWithFirstChapterVariables } from '@seihouse/celestial-library-dataconnect';

// The `CreateStoryWithFirstChapter` mutation requires an argument of type `CreateStoryWithFirstChapterVariables`:
const createStoryWithFirstChapterVars: CreateStoryWithFirstChapterVariables = {
  title: ..., 
  genre: ..., 
  mainCharacterName: ..., // optional
  premise: ..., // optional
  chapterTitle: ..., 
  chapterPremise: ..., // optional
};

// Call the `createStoryWithFirstChapter()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createStoryWithFirstChapter(createStoryWithFirstChapterVars);
// Variables can be defined inline as well.
const { data } = await createStoryWithFirstChapter({ title: ..., genre: ..., mainCharacterName: ..., premise: ..., chapterTitle: ..., chapterPremise: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createStoryWithFirstChapter(dataConnect, createStoryWithFirstChapterVars);

console.log(data.userAccount_upsert);
console.log(data.story_insert);
console.log(data.storyMember_insert);
console.log(data.chapter_insert);

// Or, you can use the `Promise` API.
createStoryWithFirstChapter(createStoryWithFirstChapterVars).then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
  console.log(data.story_insert);
  console.log(data.storyMember_insert);
  console.log(data.chapter_insert);
});
```

### Using `CreateStoryWithFirstChapter`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createStoryWithFirstChapterRef, CreateStoryWithFirstChapterVariables } from '@seihouse/celestial-library-dataconnect';

// The `CreateStoryWithFirstChapter` mutation requires an argument of type `CreateStoryWithFirstChapterVariables`:
const createStoryWithFirstChapterVars: CreateStoryWithFirstChapterVariables = {
  title: ..., 
  genre: ..., 
  mainCharacterName: ..., // optional
  premise: ..., // optional
  chapterTitle: ..., 
  chapterPremise: ..., // optional
};

// Call the `createStoryWithFirstChapterRef()` function to get a reference to the mutation.
const ref = createStoryWithFirstChapterRef(createStoryWithFirstChapterVars);
// Variables can be defined inline as well.
const ref = createStoryWithFirstChapterRef({ title: ..., genre: ..., mainCharacterName: ..., premise: ..., chapterTitle: ..., chapterPremise: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createStoryWithFirstChapterRef(dataConnect, createStoryWithFirstChapterVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userAccount_upsert);
console.log(data.story_insert);
console.log(data.storyMember_insert);
console.log(data.chapter_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
  console.log(data.story_insert);
  console.log(data.storyMember_insert);
  console.log(data.chapter_insert);
});
```

## CreateMyChapter
You can execute the `CreateMyChapter` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createMyChapter(vars: CreateMyChapterVariables): MutationPromise<CreateMyChapterData, CreateMyChapterVariables>;

interface CreateMyChapterRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMyChapterVariables): MutationRef<CreateMyChapterData, CreateMyChapterVariables>;
}
export const createMyChapterRef: CreateMyChapterRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMyChapter(dc: DataConnect, vars: CreateMyChapterVariables): MutationPromise<CreateMyChapterData, CreateMyChapterVariables>;

interface CreateMyChapterRef {
  ...
  (dc: DataConnect, vars: CreateMyChapterVariables): MutationRef<CreateMyChapterData, CreateMyChapterVariables>;
}
export const createMyChapterRef: CreateMyChapterRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMyChapterRef:
```typescript
const name = createMyChapterRef.operationName;
console.log(name);
```

### Variables
The `CreateMyChapter` mutation requires an argument of type `CreateMyChapterVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMyChapterVariables {
  storyId: UUIDString;
  chapterNumber: number;
  title: string;
  premise?: string | null;
}
```
### Return Type
Recall that executing the `CreateMyChapter` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMyChapterData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMyChapterData {
  chapter_insert: Chapter_Key;
}
```
### Using `CreateMyChapter`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMyChapter, CreateMyChapterVariables } from '@seihouse/celestial-library-dataconnect';

// The `CreateMyChapter` mutation requires an argument of type `CreateMyChapterVariables`:
const createMyChapterVars: CreateMyChapterVariables = {
  storyId: ..., 
  chapterNumber: ..., 
  title: ..., 
  premise: ..., // optional
};

// Call the `createMyChapter()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMyChapter(createMyChapterVars);
// Variables can be defined inline as well.
const { data } = await createMyChapter({ storyId: ..., chapterNumber: ..., title: ..., premise: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMyChapter(dataConnect, createMyChapterVars);

console.log(data.chapter_insert);

// Or, you can use the `Promise` API.
createMyChapter(createMyChapterVars).then((response) => {
  const data = response.data;
  console.log(data.chapter_insert);
});
```

### Using `CreateMyChapter`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMyChapterRef, CreateMyChapterVariables } from '@seihouse/celestial-library-dataconnect';

// The `CreateMyChapter` mutation requires an argument of type `CreateMyChapterVariables`:
const createMyChapterVars: CreateMyChapterVariables = {
  storyId: ..., 
  chapterNumber: ..., 
  title: ..., 
  premise: ..., // optional
};

// Call the `createMyChapterRef()` function to get a reference to the mutation.
const ref = createMyChapterRef(createMyChapterVars);
// Variables can be defined inline as well.
const ref = createMyChapterRef({ storyId: ..., chapterNumber: ..., title: ..., premise: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMyChapterRef(dataConnect, createMyChapterVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chapter_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chapter_insert);
});
```

## SoftDeleteMyStory
You can execute the `SoftDeleteMyStory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
softDeleteMyStory(vars: SoftDeleteMyStoryVariables): MutationPromise<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;

interface SoftDeleteMyStoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SoftDeleteMyStoryVariables): MutationRef<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;
}
export const softDeleteMyStoryRef: SoftDeleteMyStoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
softDeleteMyStory(dc: DataConnect, vars: SoftDeleteMyStoryVariables): MutationPromise<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;

interface SoftDeleteMyStoryRef {
  ...
  (dc: DataConnect, vars: SoftDeleteMyStoryVariables): MutationRef<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;
}
export const softDeleteMyStoryRef: SoftDeleteMyStoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the softDeleteMyStoryRef:
```typescript
const name = softDeleteMyStoryRef.operationName;
console.log(name);
```

### Variables
The `SoftDeleteMyStory` mutation requires an argument of type `SoftDeleteMyStoryVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SoftDeleteMyStoryVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `SoftDeleteMyStory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SoftDeleteMyStoryData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SoftDeleteMyStoryData {
  story_update?: Story_Key | null;
}
```
### Using `SoftDeleteMyStory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, softDeleteMyStory, SoftDeleteMyStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `SoftDeleteMyStory` mutation requires an argument of type `SoftDeleteMyStoryVariables`:
const softDeleteMyStoryVars: SoftDeleteMyStoryVariables = {
  id: ..., 
};

// Call the `softDeleteMyStory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await softDeleteMyStory(softDeleteMyStoryVars);
// Variables can be defined inline as well.
const { data } = await softDeleteMyStory({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await softDeleteMyStory(dataConnect, softDeleteMyStoryVars);

console.log(data.story_update);

// Or, you can use the `Promise` API.
softDeleteMyStory(softDeleteMyStoryVars).then((response) => {
  const data = response.data;
  console.log(data.story_update);
});
```

### Using `SoftDeleteMyStory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, softDeleteMyStoryRef, SoftDeleteMyStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `SoftDeleteMyStory` mutation requires an argument of type `SoftDeleteMyStoryVariables`:
const softDeleteMyStoryVars: SoftDeleteMyStoryVariables = {
  id: ..., 
};

// Call the `softDeleteMyStoryRef()` function to get a reference to the mutation.
const ref = softDeleteMyStoryRef(softDeleteMyStoryVars);
// Variables can be defined inline as well.
const ref = softDeleteMyStoryRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = softDeleteMyStoryRef(dataConnect, softDeleteMyStoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.story_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.story_update);
});
```

## AdminPurgeFoundationProbe
You can execute the `AdminPurgeFoundationProbe` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminPurgeFoundationProbe(vars: AdminPurgeFoundationProbeVariables): MutationPromise<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;

interface AdminPurgeFoundationProbeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminPurgeFoundationProbeVariables): MutationRef<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;
}
export const adminPurgeFoundationProbeRef: AdminPurgeFoundationProbeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminPurgeFoundationProbe(dc: DataConnect, vars: AdminPurgeFoundationProbeVariables): MutationPromise<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;

interface AdminPurgeFoundationProbeRef {
  ...
  (dc: DataConnect, vars: AdminPurgeFoundationProbeVariables): MutationRef<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;
}
export const adminPurgeFoundationProbeRef: AdminPurgeFoundationProbeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminPurgeFoundationProbeRef:
```typescript
const name = adminPurgeFoundationProbeRef.operationName;
console.log(name);
```

### Variables
The `AdminPurgeFoundationProbe` mutation requires an argument of type `AdminPurgeFoundationProbeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminPurgeFoundationProbeVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `AdminPurgeFoundationProbe` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminPurgeFoundationProbeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminPurgeFoundationProbeData {
  foundationProbe_delete?: FoundationProbe_Key | null;
}
```
### Using `AdminPurgeFoundationProbe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminPurgeFoundationProbe, AdminPurgeFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminPurgeFoundationProbe` mutation requires an argument of type `AdminPurgeFoundationProbeVariables`:
const adminPurgeFoundationProbeVars: AdminPurgeFoundationProbeVariables = {
  id: ..., 
};

// Call the `adminPurgeFoundationProbe()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminPurgeFoundationProbe(adminPurgeFoundationProbeVars);
// Variables can be defined inline as well.
const { data } = await adminPurgeFoundationProbe({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminPurgeFoundationProbe(dataConnect, adminPurgeFoundationProbeVars);

console.log(data.foundationProbe_delete);

// Or, you can use the `Promise` API.
adminPurgeFoundationProbe(adminPurgeFoundationProbeVars).then((response) => {
  const data = response.data;
  console.log(data.foundationProbe_delete);
});
```

### Using `AdminPurgeFoundationProbe`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminPurgeFoundationProbeRef, AdminPurgeFoundationProbeVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminPurgeFoundationProbe` mutation requires an argument of type `AdminPurgeFoundationProbeVariables`:
const adminPurgeFoundationProbeVars: AdminPurgeFoundationProbeVariables = {
  id: ..., 
};

// Call the `adminPurgeFoundationProbeRef()` function to get a reference to the mutation.
const ref = adminPurgeFoundationProbeRef(adminPurgeFoundationProbeVars);
// Variables can be defined inline as well.
const ref = adminPurgeFoundationProbeRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminPurgeFoundationProbeRef(dataConnect, adminPurgeFoundationProbeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.foundationProbe_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.foundationProbe_delete);
});
```

## AdminPurgeFoundationStory
You can execute the `AdminPurgeFoundationStory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminPurgeFoundationStory(vars: AdminPurgeFoundationStoryVariables): MutationPromise<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;

interface AdminPurgeFoundationStoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminPurgeFoundationStoryVariables): MutationRef<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;
}
export const adminPurgeFoundationStoryRef: AdminPurgeFoundationStoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminPurgeFoundationStory(dc: DataConnect, vars: AdminPurgeFoundationStoryVariables): MutationPromise<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;

interface AdminPurgeFoundationStoryRef {
  ...
  (dc: DataConnect, vars: AdminPurgeFoundationStoryVariables): MutationRef<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;
}
export const adminPurgeFoundationStoryRef: AdminPurgeFoundationStoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminPurgeFoundationStoryRef:
```typescript
const name = adminPurgeFoundationStoryRef.operationName;
console.log(name);
```

### Variables
The `AdminPurgeFoundationStory` mutation requires an argument of type `AdminPurgeFoundationStoryVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminPurgeFoundationStoryVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `AdminPurgeFoundationStory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminPurgeFoundationStoryData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminPurgeFoundationStoryData {
  story_delete?: Story_Key | null;
}
```
### Using `AdminPurgeFoundationStory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminPurgeFoundationStory, AdminPurgeFoundationStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminPurgeFoundationStory` mutation requires an argument of type `AdminPurgeFoundationStoryVariables`:
const adminPurgeFoundationStoryVars: AdminPurgeFoundationStoryVariables = {
  id: ..., 
};

// Call the `adminPurgeFoundationStory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminPurgeFoundationStory(adminPurgeFoundationStoryVars);
// Variables can be defined inline as well.
const { data } = await adminPurgeFoundationStory({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminPurgeFoundationStory(dataConnect, adminPurgeFoundationStoryVars);

console.log(data.story_delete);

// Or, you can use the `Promise` API.
adminPurgeFoundationStory(adminPurgeFoundationStoryVars).then((response) => {
  const data = response.data;
  console.log(data.story_delete);
});
```

### Using `AdminPurgeFoundationStory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminPurgeFoundationStoryRef, AdminPurgeFoundationStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminPurgeFoundationStory` mutation requires an argument of type `AdminPurgeFoundationStoryVariables`:
const adminPurgeFoundationStoryVars: AdminPurgeFoundationStoryVariables = {
  id: ..., 
};

// Call the `adminPurgeFoundationStoryRef()` function to get a reference to the mutation.
const ref = adminPurgeFoundationStoryRef(adminPurgeFoundationStoryVars);
// Variables can be defined inline as well.
const ref = adminPurgeFoundationStoryRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminPurgeFoundationStoryRef(dataConnect, adminPurgeFoundationStoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.story_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.story_delete);
});
```

## AdminReserveMediaAsset
You can execute the `AdminReserveMediaAsset` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminReserveMediaAsset(vars: AdminReserveMediaAssetVariables): MutationPromise<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;

interface AdminReserveMediaAssetRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReserveMediaAssetVariables): MutationRef<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;
}
export const adminReserveMediaAssetRef: AdminReserveMediaAssetRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminReserveMediaAsset(dc: DataConnect, vars: AdminReserveMediaAssetVariables): MutationPromise<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;

interface AdminReserveMediaAssetRef {
  ...
  (dc: DataConnect, vars: AdminReserveMediaAssetVariables): MutationRef<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;
}
export const adminReserveMediaAssetRef: AdminReserveMediaAssetRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminReserveMediaAssetRef:
```typescript
const name = adminReserveMediaAssetRef.operationName;
console.log(name);
```

### Variables
The `AdminReserveMediaAsset` mutation requires an argument of type `AdminReserveMediaAssetVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminReserveMediaAssetVariables {
  id: UUIDString;
  ownerUid: string;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
  storyId?: UUIDString | null;
  generationJobId?: UUIDString | null;
  replacesAssetId?: UUIDString | null;
  assetType: MediaAssetType;
  purpose: string;
  visibility: MediaVisibility;
  bucket: string;
  objectKey: string;
  originalFilename?: string | null;
  mimeType: string;
  extension: string;
  byteSize: Int64String;
  checksumSha256: string;
  width?: number | null;
  height?: number | null;
  durationMs?: Int64String | null;
  version: number;
  cacheControl: string;
  sourceKind: string;
}
```
### Return Type
Recall that executing the `AdminReserveMediaAsset` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminReserveMediaAssetData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminReserveMediaAssetData {
  userAccount_upsert: UserAccount_Key;
  mediaAsset_insert: MediaAsset_Key;
  mediaUploadAttempt_insert: MediaUploadAttempt_Key;
}
```
### Using `AdminReserveMediaAsset`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminReserveMediaAsset, AdminReserveMediaAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReserveMediaAsset` mutation requires an argument of type `AdminReserveMediaAssetVariables`:
const adminReserveMediaAssetVars: AdminReserveMediaAssetVariables = {
  id: ..., 
  ownerUid: ..., 
  ownerEmail: ..., // optional
  ownerDisplayName: ..., // optional
  storyId: ..., // optional
  generationJobId: ..., // optional
  replacesAssetId: ..., // optional
  assetType: ..., 
  purpose: ..., 
  visibility: ..., 
  bucket: ..., 
  objectKey: ..., 
  originalFilename: ..., // optional
  mimeType: ..., 
  extension: ..., 
  byteSize: ..., 
  checksumSha256: ..., 
  width: ..., // optional
  height: ..., // optional
  durationMs: ..., // optional
  version: ..., 
  cacheControl: ..., 
  sourceKind: ..., 
};

// Call the `adminReserveMediaAsset()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminReserveMediaAsset(adminReserveMediaAssetVars);
// Variables can be defined inline as well.
const { data } = await adminReserveMediaAsset({ id: ..., ownerUid: ..., ownerEmail: ..., ownerDisplayName: ..., storyId: ..., generationJobId: ..., replacesAssetId: ..., assetType: ..., purpose: ..., visibility: ..., bucket: ..., objectKey: ..., originalFilename: ..., mimeType: ..., extension: ..., byteSize: ..., checksumSha256: ..., width: ..., height: ..., durationMs: ..., version: ..., cacheControl: ..., sourceKind: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminReserveMediaAsset(dataConnect, adminReserveMediaAssetVars);

console.log(data.userAccount_upsert);
console.log(data.mediaAsset_insert);
console.log(data.mediaUploadAttempt_insert);

// Or, you can use the `Promise` API.
adminReserveMediaAsset(adminReserveMediaAssetVars).then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
  console.log(data.mediaAsset_insert);
  console.log(data.mediaUploadAttempt_insert);
});
```

### Using `AdminReserveMediaAsset`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminReserveMediaAssetRef, AdminReserveMediaAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReserveMediaAsset` mutation requires an argument of type `AdminReserveMediaAssetVariables`:
const adminReserveMediaAssetVars: AdminReserveMediaAssetVariables = {
  id: ..., 
  ownerUid: ..., 
  ownerEmail: ..., // optional
  ownerDisplayName: ..., // optional
  storyId: ..., // optional
  generationJobId: ..., // optional
  replacesAssetId: ..., // optional
  assetType: ..., 
  purpose: ..., 
  visibility: ..., 
  bucket: ..., 
  objectKey: ..., 
  originalFilename: ..., // optional
  mimeType: ..., 
  extension: ..., 
  byteSize: ..., 
  checksumSha256: ..., 
  width: ..., // optional
  height: ..., // optional
  durationMs: ..., // optional
  version: ..., 
  cacheControl: ..., 
  sourceKind: ..., 
};

// Call the `adminReserveMediaAssetRef()` function to get a reference to the mutation.
const ref = adminReserveMediaAssetRef(adminReserveMediaAssetVars);
// Variables can be defined inline as well.
const ref = adminReserveMediaAssetRef({ id: ..., ownerUid: ..., ownerEmail: ..., ownerDisplayName: ..., storyId: ..., generationJobId: ..., replacesAssetId: ..., assetType: ..., purpose: ..., visibility: ..., bucket: ..., objectKey: ..., originalFilename: ..., mimeType: ..., extension: ..., byteSize: ..., checksumSha256: ..., width: ..., height: ..., durationMs: ..., version: ..., cacheControl: ..., sourceKind: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminReserveMediaAssetRef(dataConnect, adminReserveMediaAssetVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userAccount_upsert);
console.log(data.mediaAsset_insert);
console.log(data.mediaUploadAttempt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userAccount_upsert);
  console.log(data.mediaAsset_insert);
  console.log(data.mediaUploadAttempt_insert);
});
```

## AdminCommitMediaAssetReady
You can execute the `AdminCommitMediaAssetReady` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminCommitMediaAssetReady(vars: AdminCommitMediaAssetReadyVariables): MutationPromise<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;

interface AdminCommitMediaAssetReadyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCommitMediaAssetReadyVariables): MutationRef<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;
}
export const adminCommitMediaAssetReadyRef: AdminCommitMediaAssetReadyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminCommitMediaAssetReady(dc: DataConnect, vars: AdminCommitMediaAssetReadyVariables): MutationPromise<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;

interface AdminCommitMediaAssetReadyRef {
  ...
  (dc: DataConnect, vars: AdminCommitMediaAssetReadyVariables): MutationRef<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;
}
export const adminCommitMediaAssetReadyRef: AdminCommitMediaAssetReadyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminCommitMediaAssetReadyRef:
```typescript
const name = adminCommitMediaAssetReadyRef.operationName;
console.log(name);
```

### Variables
The `AdminCommitMediaAssetReady` mutation requires an argument of type `AdminCommitMediaAssetReadyVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminCommitMediaAssetReadyVariables {
  id: UUIDString;
  ownerUid: string;
  etag?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `AdminCommitMediaAssetReady` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminCommitMediaAssetReadyData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminCommitMediaAssetReadyData {
  assetReady?: MediaAsset_Key | null;
  mediaAttachment_insert: MediaAttachment_Key;
  mediaUploadAttempt_updateMany: number;
}
```
### Using `AdminCommitMediaAssetReady`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminCommitMediaAssetReady, AdminCommitMediaAssetReadyVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCommitMediaAssetReady` mutation requires an argument of type `AdminCommitMediaAssetReadyVariables`:
const adminCommitMediaAssetReadyVars: AdminCommitMediaAssetReadyVariables = {
  id: ..., 
  ownerUid: ..., 
  etag: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
};

// Call the `adminCommitMediaAssetReady()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminCommitMediaAssetReady(adminCommitMediaAssetReadyVars);
// Variables can be defined inline as well.
const { data } = await adminCommitMediaAssetReady({ id: ..., ownerUid: ..., etag: ..., targetKind: ..., targetKey: ..., purpose: ..., storyId: ..., chapterId: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminCommitMediaAssetReady(dataConnect, adminCommitMediaAssetReadyVars);

console.log(data.assetReady);
console.log(data.mediaAttachment_insert);
console.log(data.mediaUploadAttempt_updateMany);

// Or, you can use the `Promise` API.
adminCommitMediaAssetReady(adminCommitMediaAssetReadyVars).then((response) => {
  const data = response.data;
  console.log(data.assetReady);
  console.log(data.mediaAttachment_insert);
  console.log(data.mediaUploadAttempt_updateMany);
});
```

### Using `AdminCommitMediaAssetReady`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminCommitMediaAssetReadyRef, AdminCommitMediaAssetReadyVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCommitMediaAssetReady` mutation requires an argument of type `AdminCommitMediaAssetReadyVariables`:
const adminCommitMediaAssetReadyVars: AdminCommitMediaAssetReadyVariables = {
  id: ..., 
  ownerUid: ..., 
  etag: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
};

// Call the `adminCommitMediaAssetReadyRef()` function to get a reference to the mutation.
const ref = adminCommitMediaAssetReadyRef(adminCommitMediaAssetReadyVars);
// Variables can be defined inline as well.
const ref = adminCommitMediaAssetReadyRef({ id: ..., ownerUid: ..., etag: ..., targetKind: ..., targetKey: ..., purpose: ..., storyId: ..., chapterId: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminCommitMediaAssetReadyRef(dataConnect, adminCommitMediaAssetReadyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.assetReady);
console.log(data.mediaAttachment_insert);
console.log(data.mediaUploadAttempt_updateMany);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.assetReady);
  console.log(data.mediaAttachment_insert);
  console.log(data.mediaUploadAttempt_updateMany);
});
```

## AdminCommitMediaAssetReplacement
You can execute the `AdminCommitMediaAssetReplacement` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminCommitMediaAssetReplacement(vars: AdminCommitMediaAssetReplacementVariables): MutationPromise<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;

interface AdminCommitMediaAssetReplacementRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCommitMediaAssetReplacementVariables): MutationRef<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;
}
export const adminCommitMediaAssetReplacementRef: AdminCommitMediaAssetReplacementRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminCommitMediaAssetReplacement(dc: DataConnect, vars: AdminCommitMediaAssetReplacementVariables): MutationPromise<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;

interface AdminCommitMediaAssetReplacementRef {
  ...
  (dc: DataConnect, vars: AdminCommitMediaAssetReplacementVariables): MutationRef<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;
}
export const adminCommitMediaAssetReplacementRef: AdminCommitMediaAssetReplacementRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminCommitMediaAssetReplacementRef:
```typescript
const name = adminCommitMediaAssetReplacementRef.operationName;
console.log(name);
```

### Variables
The `AdminCommitMediaAssetReplacement` mutation requires an argument of type `AdminCommitMediaAssetReplacementVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminCommitMediaAssetReplacementVariables {
  id: UUIDString;
  ownerUid: string;
  replacesAssetId: UUIDString;
  replacesBucket: string;
  replacesObjectKey: string;
  etag?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
  cleanupAfter: TimestampString;
}
```
### Return Type
Recall that executing the `AdminCommitMediaAssetReplacement` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminCommitMediaAssetReplacementData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminCommitMediaAssetReplacementData {
  replacementReady?: MediaAsset_Key | null;
  mediaAttachment_updateMany: number;
  mediaAttachment_insert: MediaAttachment_Key;
  archivedPrevious?: MediaAsset_Key | null;
  mediaCleanupTask_insert: MediaCleanupTask_Key;
  mediaUploadAttempt_updateMany: number;
}
```
### Using `AdminCommitMediaAssetReplacement`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminCommitMediaAssetReplacement, AdminCommitMediaAssetReplacementVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCommitMediaAssetReplacement` mutation requires an argument of type `AdminCommitMediaAssetReplacementVariables`:
const adminCommitMediaAssetReplacementVars: AdminCommitMediaAssetReplacementVariables = {
  id: ..., 
  ownerUid: ..., 
  replacesAssetId: ..., 
  replacesBucket: ..., 
  replacesObjectKey: ..., 
  etag: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
  cleanupAfter: ..., 
};

// Call the `adminCommitMediaAssetReplacement()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminCommitMediaAssetReplacement(adminCommitMediaAssetReplacementVars);
// Variables can be defined inline as well.
const { data } = await adminCommitMediaAssetReplacement({ id: ..., ownerUid: ..., replacesAssetId: ..., replacesBucket: ..., replacesObjectKey: ..., etag: ..., targetKind: ..., targetKey: ..., purpose: ..., storyId: ..., chapterId: ..., entityId: ..., cleanupAfter: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminCommitMediaAssetReplacement(dataConnect, adminCommitMediaAssetReplacementVars);

console.log(data.replacementReady);
console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAttachment_insert);
console.log(data.archivedPrevious);
console.log(data.mediaCleanupTask_insert);
console.log(data.mediaUploadAttempt_updateMany);

// Or, you can use the `Promise` API.
adminCommitMediaAssetReplacement(adminCommitMediaAssetReplacementVars).then((response) => {
  const data = response.data;
  console.log(data.replacementReady);
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAttachment_insert);
  console.log(data.archivedPrevious);
  console.log(data.mediaCleanupTask_insert);
  console.log(data.mediaUploadAttempt_updateMany);
});
```

### Using `AdminCommitMediaAssetReplacement`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminCommitMediaAssetReplacementRef, AdminCommitMediaAssetReplacementVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCommitMediaAssetReplacement` mutation requires an argument of type `AdminCommitMediaAssetReplacementVariables`:
const adminCommitMediaAssetReplacementVars: AdminCommitMediaAssetReplacementVariables = {
  id: ..., 
  ownerUid: ..., 
  replacesAssetId: ..., 
  replacesBucket: ..., 
  replacesObjectKey: ..., 
  etag: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
  cleanupAfter: ..., 
};

// Call the `adminCommitMediaAssetReplacementRef()` function to get a reference to the mutation.
const ref = adminCommitMediaAssetReplacementRef(adminCommitMediaAssetReplacementVars);
// Variables can be defined inline as well.
const ref = adminCommitMediaAssetReplacementRef({ id: ..., ownerUid: ..., replacesAssetId: ..., replacesBucket: ..., replacesObjectKey: ..., etag: ..., targetKind: ..., targetKey: ..., purpose: ..., storyId: ..., chapterId: ..., entityId: ..., cleanupAfter: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminCommitMediaAssetReplacementRef(dataConnect, adminCommitMediaAssetReplacementVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.replacementReady);
console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAttachment_insert);
console.log(data.archivedPrevious);
console.log(data.mediaCleanupTask_insert);
console.log(data.mediaUploadAttempt_updateMany);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.replacementReady);
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAttachment_insert);
  console.log(data.archivedPrevious);
  console.log(data.mediaCleanupTask_insert);
  console.log(data.mediaUploadAttempt_updateMany);
});
```

## AdminMarkMediaAssetFailed
You can execute the `AdminMarkMediaAssetFailed` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminMarkMediaAssetFailed(vars: AdminMarkMediaAssetFailedVariables): MutationPromise<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;

interface AdminMarkMediaAssetFailedRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminMarkMediaAssetFailedVariables): MutationRef<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;
}
export const adminMarkMediaAssetFailedRef: AdminMarkMediaAssetFailedRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminMarkMediaAssetFailed(dc: DataConnect, vars: AdminMarkMediaAssetFailedVariables): MutationPromise<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;

interface AdminMarkMediaAssetFailedRef {
  ...
  (dc: DataConnect, vars: AdminMarkMediaAssetFailedVariables): MutationRef<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;
}
export const adminMarkMediaAssetFailedRef: AdminMarkMediaAssetFailedRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminMarkMediaAssetFailedRef:
```typescript
const name = adminMarkMediaAssetFailedRef.operationName;
console.log(name);
```

### Variables
The `AdminMarkMediaAssetFailed` mutation requires an argument of type `AdminMarkMediaAssetFailedVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminMarkMediaAssetFailedVariables {
  id: UUIDString;
  ownerUid: string;
  failureCode: string;
  failureMessage: string;
}
```
### Return Type
Recall that executing the `AdminMarkMediaAssetFailed` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminMarkMediaAssetFailedData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminMarkMediaAssetFailedData {
  mediaAsset_update?: MediaAsset_Key | null;
  mediaUploadAttempt_updateMany: number;
}
```
### Using `AdminMarkMediaAssetFailed`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminMarkMediaAssetFailed, AdminMarkMediaAssetFailedVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminMarkMediaAssetFailed` mutation requires an argument of type `AdminMarkMediaAssetFailedVariables`:
const adminMarkMediaAssetFailedVars: AdminMarkMediaAssetFailedVariables = {
  id: ..., 
  ownerUid: ..., 
  failureCode: ..., 
  failureMessage: ..., 
};

// Call the `adminMarkMediaAssetFailed()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminMarkMediaAssetFailed(adminMarkMediaAssetFailedVars);
// Variables can be defined inline as well.
const { data } = await adminMarkMediaAssetFailed({ id: ..., ownerUid: ..., failureCode: ..., failureMessage: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminMarkMediaAssetFailed(dataConnect, adminMarkMediaAssetFailedVars);

console.log(data.mediaAsset_update);
console.log(data.mediaUploadAttempt_updateMany);

// Or, you can use the `Promise` API.
adminMarkMediaAssetFailed(adminMarkMediaAssetFailedVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_update);
  console.log(data.mediaUploadAttempt_updateMany);
});
```

### Using `AdminMarkMediaAssetFailed`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminMarkMediaAssetFailedRef, AdminMarkMediaAssetFailedVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminMarkMediaAssetFailed` mutation requires an argument of type `AdminMarkMediaAssetFailedVariables`:
const adminMarkMediaAssetFailedVars: AdminMarkMediaAssetFailedVariables = {
  id: ..., 
  ownerUid: ..., 
  failureCode: ..., 
  failureMessage: ..., 
};

// Call the `adminMarkMediaAssetFailedRef()` function to get a reference to the mutation.
const ref = adminMarkMediaAssetFailedRef(adminMarkMediaAssetFailedVars);
// Variables can be defined inline as well.
const ref = adminMarkMediaAssetFailedRef({ id: ..., ownerUid: ..., failureCode: ..., failureMessage: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminMarkMediaAssetFailedRef(dataConnect, adminMarkMediaAssetFailedVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaAsset_update);
console.log(data.mediaUploadAttempt_updateMany);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_update);
  console.log(data.mediaUploadAttempt_updateMany);
});
```

## AdminMarkMediaAssetPendingCleanup
You can execute the `AdminMarkMediaAssetPendingCleanup` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminMarkMediaAssetPendingCleanup(vars: AdminMarkMediaAssetPendingCleanupVariables): MutationPromise<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;

interface AdminMarkMediaAssetPendingCleanupRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminMarkMediaAssetPendingCleanupVariables): MutationRef<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;
}
export const adminMarkMediaAssetPendingCleanupRef: AdminMarkMediaAssetPendingCleanupRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminMarkMediaAssetPendingCleanup(dc: DataConnect, vars: AdminMarkMediaAssetPendingCleanupVariables): MutationPromise<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;

interface AdminMarkMediaAssetPendingCleanupRef {
  ...
  (dc: DataConnect, vars: AdminMarkMediaAssetPendingCleanupVariables): MutationRef<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;
}
export const adminMarkMediaAssetPendingCleanupRef: AdminMarkMediaAssetPendingCleanupRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminMarkMediaAssetPendingCleanupRef:
```typescript
const name = adminMarkMediaAssetPendingCleanupRef.operationName;
console.log(name);
```

### Variables
The `AdminMarkMediaAssetPendingCleanup` mutation requires an argument of type `AdminMarkMediaAssetPendingCleanupVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminMarkMediaAssetPendingCleanupVariables {
  id: UUIDString;
  ownerUid: string;
  bucket: string;
  objectKey: string;
  reason: string;
  failureMessage?: string | null;
}
```
### Return Type
Recall that executing the `AdminMarkMediaAssetPendingCleanup` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminMarkMediaAssetPendingCleanupData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminMarkMediaAssetPendingCleanupData {
  mediaAsset_update?: MediaAsset_Key | null;
  mediaCleanupTask_insert: MediaCleanupTask_Key;
}
```
### Using `AdminMarkMediaAssetPendingCleanup`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminMarkMediaAssetPendingCleanup, AdminMarkMediaAssetPendingCleanupVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminMarkMediaAssetPendingCleanup` mutation requires an argument of type `AdminMarkMediaAssetPendingCleanupVariables`:
const adminMarkMediaAssetPendingCleanupVars: AdminMarkMediaAssetPendingCleanupVariables = {
  id: ..., 
  ownerUid: ..., 
  bucket: ..., 
  objectKey: ..., 
  reason: ..., 
  failureMessage: ..., // optional
};

// Call the `adminMarkMediaAssetPendingCleanup()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminMarkMediaAssetPendingCleanup(adminMarkMediaAssetPendingCleanupVars);
// Variables can be defined inline as well.
const { data } = await adminMarkMediaAssetPendingCleanup({ id: ..., ownerUid: ..., bucket: ..., objectKey: ..., reason: ..., failureMessage: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminMarkMediaAssetPendingCleanup(dataConnect, adminMarkMediaAssetPendingCleanupVars);

console.log(data.mediaAsset_update);
console.log(data.mediaCleanupTask_insert);

// Or, you can use the `Promise` API.
adminMarkMediaAssetPendingCleanup(adminMarkMediaAssetPendingCleanupVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_update);
  console.log(data.mediaCleanupTask_insert);
});
```

### Using `AdminMarkMediaAssetPendingCleanup`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminMarkMediaAssetPendingCleanupRef, AdminMarkMediaAssetPendingCleanupVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminMarkMediaAssetPendingCleanup` mutation requires an argument of type `AdminMarkMediaAssetPendingCleanupVariables`:
const adminMarkMediaAssetPendingCleanupVars: AdminMarkMediaAssetPendingCleanupVariables = {
  id: ..., 
  ownerUid: ..., 
  bucket: ..., 
  objectKey: ..., 
  reason: ..., 
  failureMessage: ..., // optional
};

// Call the `adminMarkMediaAssetPendingCleanupRef()` function to get a reference to the mutation.
const ref = adminMarkMediaAssetPendingCleanupRef(adminMarkMediaAssetPendingCleanupVars);
// Variables can be defined inline as well.
const ref = adminMarkMediaAssetPendingCleanupRef({ id: ..., ownerUid: ..., bucket: ..., objectKey: ..., reason: ..., failureMessage: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminMarkMediaAssetPendingCleanupRef(dataConnect, adminMarkMediaAssetPendingCleanupVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaAsset_update);
console.log(data.mediaCleanupTask_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_update);
  console.log(data.mediaCleanupTask_insert);
});
```

## AdminRequestMediaAssetDeletion
You can execute the `AdminRequestMediaAssetDeletion` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminRequestMediaAssetDeletion(vars: AdminRequestMediaAssetDeletionVariables): MutationPromise<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;

interface AdminRequestMediaAssetDeletionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminRequestMediaAssetDeletionVariables): MutationRef<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;
}
export const adminRequestMediaAssetDeletionRef: AdminRequestMediaAssetDeletionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminRequestMediaAssetDeletion(dc: DataConnect, vars: AdminRequestMediaAssetDeletionVariables): MutationPromise<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;

interface AdminRequestMediaAssetDeletionRef {
  ...
  (dc: DataConnect, vars: AdminRequestMediaAssetDeletionVariables): MutationRef<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;
}
export const adminRequestMediaAssetDeletionRef: AdminRequestMediaAssetDeletionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminRequestMediaAssetDeletionRef:
```typescript
const name = adminRequestMediaAssetDeletionRef.operationName;
console.log(name);
```

### Variables
The `AdminRequestMediaAssetDeletion` mutation requires an argument of type `AdminRequestMediaAssetDeletionVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminRequestMediaAssetDeletionVariables {
  id: UUIDString;
  ownerUid: string;
  bucket: string;
  objectKey: string;
}
```
### Return Type
Recall that executing the `AdminRequestMediaAssetDeletion` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminRequestMediaAssetDeletionData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminRequestMediaAssetDeletionData {
  mediaAsset_update?: MediaAsset_Key | null;
  mediaAttachment_updateMany: number;
  mediaCleanupTask_insert: MediaCleanupTask_Key;
}
```
### Using `AdminRequestMediaAssetDeletion`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminRequestMediaAssetDeletion, AdminRequestMediaAssetDeletionVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminRequestMediaAssetDeletion` mutation requires an argument of type `AdminRequestMediaAssetDeletionVariables`:
const adminRequestMediaAssetDeletionVars: AdminRequestMediaAssetDeletionVariables = {
  id: ..., 
  ownerUid: ..., 
  bucket: ..., 
  objectKey: ..., 
};

// Call the `adminRequestMediaAssetDeletion()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminRequestMediaAssetDeletion(adminRequestMediaAssetDeletionVars);
// Variables can be defined inline as well.
const { data } = await adminRequestMediaAssetDeletion({ id: ..., ownerUid: ..., bucket: ..., objectKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminRequestMediaAssetDeletion(dataConnect, adminRequestMediaAssetDeletionVars);

console.log(data.mediaAsset_update);
console.log(data.mediaAttachment_updateMany);
console.log(data.mediaCleanupTask_insert);

// Or, you can use the `Promise` API.
adminRequestMediaAssetDeletion(adminRequestMediaAssetDeletionVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_update);
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaCleanupTask_insert);
});
```

### Using `AdminRequestMediaAssetDeletion`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminRequestMediaAssetDeletionRef, AdminRequestMediaAssetDeletionVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminRequestMediaAssetDeletion` mutation requires an argument of type `AdminRequestMediaAssetDeletionVariables`:
const adminRequestMediaAssetDeletionVars: AdminRequestMediaAssetDeletionVariables = {
  id: ..., 
  ownerUid: ..., 
  bucket: ..., 
  objectKey: ..., 
};

// Call the `adminRequestMediaAssetDeletionRef()` function to get a reference to the mutation.
const ref = adminRequestMediaAssetDeletionRef(adminRequestMediaAssetDeletionVars);
// Variables can be defined inline as well.
const ref = adminRequestMediaAssetDeletionRef({ id: ..., ownerUid: ..., bucket: ..., objectKey: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminRequestMediaAssetDeletionRef(dataConnect, adminRequestMediaAssetDeletionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaAsset_update);
console.log(data.mediaAttachment_updateMany);
console.log(data.mediaCleanupTask_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_update);
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaCleanupTask_insert);
});
```

## AdminCompleteMediaCleanup
You can execute the `AdminCompleteMediaCleanup` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminCompleteMediaCleanup(vars: AdminCompleteMediaCleanupVariables): MutationPromise<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;

interface AdminCompleteMediaCleanupRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCompleteMediaCleanupVariables): MutationRef<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;
}
export const adminCompleteMediaCleanupRef: AdminCompleteMediaCleanupRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminCompleteMediaCleanup(dc: DataConnect, vars: AdminCompleteMediaCleanupVariables): MutationPromise<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;

interface AdminCompleteMediaCleanupRef {
  ...
  (dc: DataConnect, vars: AdminCompleteMediaCleanupVariables): MutationRef<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;
}
export const adminCompleteMediaCleanupRef: AdminCompleteMediaCleanupRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminCompleteMediaCleanupRef:
```typescript
const name = adminCompleteMediaCleanupRef.operationName;
console.log(name);
```

### Variables
The `AdminCompleteMediaCleanup` mutation requires an argument of type `AdminCompleteMediaCleanupVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminCompleteMediaCleanupVariables {
  taskId: UUIDString;
  assetId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminCompleteMediaCleanup` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminCompleteMediaCleanupData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminCompleteMediaCleanupData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
  mediaAsset_update?: MediaAsset_Key | null;
}
```
### Using `AdminCompleteMediaCleanup`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminCompleteMediaCleanup, AdminCompleteMediaCleanupVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCompleteMediaCleanup` mutation requires an argument of type `AdminCompleteMediaCleanupVariables`:
const adminCompleteMediaCleanupVars: AdminCompleteMediaCleanupVariables = {
  taskId: ..., 
  assetId: ..., 
};

// Call the `adminCompleteMediaCleanup()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminCompleteMediaCleanup(adminCompleteMediaCleanupVars);
// Variables can be defined inline as well.
const { data } = await adminCompleteMediaCleanup({ taskId: ..., assetId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminCompleteMediaCleanup(dataConnect, adminCompleteMediaCleanupVars);

console.log(data.mediaCleanupTask_update);
console.log(data.mediaAsset_update);

// Or, you can use the `Promise` API.
adminCompleteMediaCleanup(adminCompleteMediaCleanupVars).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
  console.log(data.mediaAsset_update);
});
```

### Using `AdminCompleteMediaCleanup`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminCompleteMediaCleanupRef, AdminCompleteMediaCleanupVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCompleteMediaCleanup` mutation requires an argument of type `AdminCompleteMediaCleanupVariables`:
const adminCompleteMediaCleanupVars: AdminCompleteMediaCleanupVariables = {
  taskId: ..., 
  assetId: ..., 
};

// Call the `adminCompleteMediaCleanupRef()` function to get a reference to the mutation.
const ref = adminCompleteMediaCleanupRef(adminCompleteMediaCleanupVars);
// Variables can be defined inline as well.
const ref = adminCompleteMediaCleanupRef({ taskId: ..., assetId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminCompleteMediaCleanupRef(dataConnect, adminCompleteMediaCleanupVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaCleanupTask_update);
console.log(data.mediaAsset_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
  console.log(data.mediaAsset_update);
});
```

## AdminFailMediaCleanup
You can execute the `AdminFailMediaCleanup` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminFailMediaCleanup(vars: AdminFailMediaCleanupVariables): MutationPromise<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;

interface AdminFailMediaCleanupRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminFailMediaCleanupVariables): MutationRef<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;
}
export const adminFailMediaCleanupRef: AdminFailMediaCleanupRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminFailMediaCleanup(dc: DataConnect, vars: AdminFailMediaCleanupVariables): MutationPromise<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;

interface AdminFailMediaCleanupRef {
  ...
  (dc: DataConnect, vars: AdminFailMediaCleanupVariables): MutationRef<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;
}
export const adminFailMediaCleanupRef: AdminFailMediaCleanupRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminFailMediaCleanupRef:
```typescript
const name = adminFailMediaCleanupRef.operationName;
console.log(name);
```

### Variables
The `AdminFailMediaCleanup` mutation requires an argument of type `AdminFailMediaCleanupVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminFailMediaCleanupVariables {
  taskId: UUIDString;
  lastError: string;
  nextAttemptAt: TimestampString;
}
```
### Return Type
Recall that executing the `AdminFailMediaCleanup` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminFailMediaCleanupData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminFailMediaCleanupData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
}
```
### Using `AdminFailMediaCleanup`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminFailMediaCleanup, AdminFailMediaCleanupVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminFailMediaCleanup` mutation requires an argument of type `AdminFailMediaCleanupVariables`:
const adminFailMediaCleanupVars: AdminFailMediaCleanupVariables = {
  taskId: ..., 
  lastError: ..., 
  nextAttemptAt: ..., 
};

// Call the `adminFailMediaCleanup()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminFailMediaCleanup(adminFailMediaCleanupVars);
// Variables can be defined inline as well.
const { data } = await adminFailMediaCleanup({ taskId: ..., lastError: ..., nextAttemptAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminFailMediaCleanup(dataConnect, adminFailMediaCleanupVars);

console.log(data.mediaCleanupTask_update);

// Or, you can use the `Promise` API.
adminFailMediaCleanup(adminFailMediaCleanupVars).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
});
```

### Using `AdminFailMediaCleanup`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminFailMediaCleanupRef, AdminFailMediaCleanupVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminFailMediaCleanup` mutation requires an argument of type `AdminFailMediaCleanupVariables`:
const adminFailMediaCleanupVars: AdminFailMediaCleanupVariables = {
  taskId: ..., 
  lastError: ..., 
  nextAttemptAt: ..., 
};

// Call the `adminFailMediaCleanupRef()` function to get a reference to the mutation.
const ref = adminFailMediaCleanupRef(adminFailMediaCleanupVars);
// Variables can be defined inline as well.
const ref = adminFailMediaCleanupRef({ taskId: ..., lastError: ..., nextAttemptAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminFailMediaCleanupRef(dataConnect, adminFailMediaCleanupVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaCleanupTask_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
});
```

## AdminDeleteOwnedStory
You can execute the `AdminDeleteOwnedStory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminDeleteOwnedStory(vars: AdminDeleteOwnedStoryVariables): MutationPromise<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;

interface AdminDeleteOwnedStoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteOwnedStoryVariables): MutationRef<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;
}
export const adminDeleteOwnedStoryRef: AdminDeleteOwnedStoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminDeleteOwnedStory(dc: DataConnect, vars: AdminDeleteOwnedStoryVariables): MutationPromise<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;

interface AdminDeleteOwnedStoryRef {
  ...
  (dc: DataConnect, vars: AdminDeleteOwnedStoryVariables): MutationRef<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;
}
export const adminDeleteOwnedStoryRef: AdminDeleteOwnedStoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminDeleteOwnedStoryRef:
```typescript
const name = adminDeleteOwnedStoryRef.operationName;
console.log(name);
```

### Variables
The `AdminDeleteOwnedStory` mutation requires an argument of type `AdminDeleteOwnedStoryVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminDeleteOwnedStoryVariables {
  ownerUid: string;
  storyId: UUIDString;
  expectedSyncRevision?: string | null;
  newSyncRevision: string;
  newRevision: Int64String;
  idempotencyKey: string;
  deletionJobId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminDeleteOwnedStory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminDeleteOwnedStoryData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminDeleteOwnedStoryData {
  storyVersionGuard?: unknown | null;
  story_update?: Story_Key | null;
  storyDeletionJob_insert: StoryDeletionJob_Key;
  storyDeletionStage_insertMany: StoryDeletionStage_Key[];
  persistenceReceipt_insert: PersistenceReceipt_Key;
  storyChange_insert: StoryChange_Key;
}
```
### Using `AdminDeleteOwnedStory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminDeleteOwnedStory, AdminDeleteOwnedStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteOwnedStory` mutation requires an argument of type `AdminDeleteOwnedStoryVariables`:
const adminDeleteOwnedStoryVars: AdminDeleteOwnedStoryVariables = {
  ownerUid: ..., 
  storyId: ..., 
  expectedSyncRevision: ..., // optional
  newSyncRevision: ..., 
  newRevision: ..., 
  idempotencyKey: ..., 
  deletionJobId: ..., 
};

// Call the `adminDeleteOwnedStory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminDeleteOwnedStory(adminDeleteOwnedStoryVars);
// Variables can be defined inline as well.
const { data } = await adminDeleteOwnedStory({ ownerUid: ..., storyId: ..., expectedSyncRevision: ..., newSyncRevision: ..., newRevision: ..., idempotencyKey: ..., deletionJobId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminDeleteOwnedStory(dataConnect, adminDeleteOwnedStoryVars);

console.log(data.storyVersionGuard);
console.log(data.story_update);
console.log(data.storyDeletionJob_insert);
console.log(data.storyDeletionStage_insertMany);
console.log(data.persistenceReceipt_insert);
console.log(data.storyChange_insert);

// Or, you can use the `Promise` API.
adminDeleteOwnedStory(adminDeleteOwnedStoryVars).then((response) => {
  const data = response.data;
  console.log(data.storyVersionGuard);
  console.log(data.story_update);
  console.log(data.storyDeletionJob_insert);
  console.log(data.storyDeletionStage_insertMany);
  console.log(data.persistenceReceipt_insert);
  console.log(data.storyChange_insert);
});
```

### Using `AdminDeleteOwnedStory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminDeleteOwnedStoryRef, AdminDeleteOwnedStoryVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteOwnedStory` mutation requires an argument of type `AdminDeleteOwnedStoryVariables`:
const adminDeleteOwnedStoryVars: AdminDeleteOwnedStoryVariables = {
  ownerUid: ..., 
  storyId: ..., 
  expectedSyncRevision: ..., // optional
  newSyncRevision: ..., 
  newRevision: ..., 
  idempotencyKey: ..., 
  deletionJobId: ..., 
};

// Call the `adminDeleteOwnedStoryRef()` function to get a reference to the mutation.
const ref = adminDeleteOwnedStoryRef(adminDeleteOwnedStoryVars);
// Variables can be defined inline as well.
const ref = adminDeleteOwnedStoryRef({ ownerUid: ..., storyId: ..., expectedSyncRevision: ..., newSyncRevision: ..., newRevision: ..., idempotencyKey: ..., deletionJobId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminDeleteOwnedStoryRef(dataConnect, adminDeleteOwnedStoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storyVersionGuard);
console.log(data.story_update);
console.log(data.storyDeletionJob_insert);
console.log(data.storyDeletionStage_insertMany);
console.log(data.persistenceReceipt_insert);
console.log(data.storyChange_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storyVersionGuard);
  console.log(data.story_update);
  console.log(data.storyDeletionJob_insert);
  console.log(data.storyDeletionStage_insertMany);
  console.log(data.persistenceReceipt_insert);
  console.log(data.storyChange_insert);
});
```

## AdminClaimStoryDeletionJob
You can execute the `AdminClaimStoryDeletionJob` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminClaimStoryDeletionJob(vars: AdminClaimStoryDeletionJobVariables): MutationPromise<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;

interface AdminClaimStoryDeletionJobRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminClaimStoryDeletionJobVariables): MutationRef<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;
}
export const adminClaimStoryDeletionJobRef: AdminClaimStoryDeletionJobRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminClaimStoryDeletionJob(dc: DataConnect, vars: AdminClaimStoryDeletionJobVariables): MutationPromise<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;

interface AdminClaimStoryDeletionJobRef {
  ...
  (dc: DataConnect, vars: AdminClaimStoryDeletionJobVariables): MutationRef<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;
}
export const adminClaimStoryDeletionJobRef: AdminClaimStoryDeletionJobRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminClaimStoryDeletionJobRef:
```typescript
const name = adminClaimStoryDeletionJobRef.operationName;
console.log(name);
```

### Variables
The `AdminClaimStoryDeletionJob` mutation requires an argument of type `AdminClaimStoryDeletionJobVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminClaimStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
  leaseExpiresAt: TimestampString;
  stage: StoryDeletionStageKind;
}
```
### Return Type
Recall that executing the `AdminClaimStoryDeletionJob` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminClaimStoryDeletionJobData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminClaimStoryDeletionJobData {
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
}
```
### Using `AdminClaimStoryDeletionJob`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminClaimStoryDeletionJob, AdminClaimStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminClaimStoryDeletionJob` mutation requires an argument of type `AdminClaimStoryDeletionJobVariables`:
const adminClaimStoryDeletionJobVars: AdminClaimStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
  leaseExpiresAt: ..., 
  stage: ..., 
};

// Call the `adminClaimStoryDeletionJob()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminClaimStoryDeletionJob(adminClaimStoryDeletionJobVars);
// Variables can be defined inline as well.
const { data } = await adminClaimStoryDeletionJob({ jobId: ..., leaseOwner: ..., leaseExpiresAt: ..., stage: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminClaimStoryDeletionJob(dataConnect, adminClaimStoryDeletionJobVars);

console.log(data.storyDeletionJob_update);
console.log(data.storyDeletionStage_update);

// Or, you can use the `Promise` API.
adminClaimStoryDeletionJob(adminClaimStoryDeletionJobVars).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionJob_update);
  console.log(data.storyDeletionStage_update);
});
```

### Using `AdminClaimStoryDeletionJob`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminClaimStoryDeletionJobRef, AdminClaimStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminClaimStoryDeletionJob` mutation requires an argument of type `AdminClaimStoryDeletionJobVariables`:
const adminClaimStoryDeletionJobVars: AdminClaimStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
  leaseExpiresAt: ..., 
  stage: ..., 
};

// Call the `adminClaimStoryDeletionJobRef()` function to get a reference to the mutation.
const ref = adminClaimStoryDeletionJobRef(adminClaimStoryDeletionJobVars);
// Variables can be defined inline as well.
const ref = adminClaimStoryDeletionJobRef({ jobId: ..., leaseOwner: ..., leaseExpiresAt: ..., stage: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminClaimStoryDeletionJobRef(dataConnect, adminClaimStoryDeletionJobVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storyDeletionJob_update);
console.log(data.storyDeletionStage_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionJob_update);
  console.log(data.storyDeletionStage_update);
});
```

## AdminFailStoryDeletionJob
You can execute the `AdminFailStoryDeletionJob` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminFailStoryDeletionJob(vars: AdminFailStoryDeletionJobVariables): MutationPromise<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;

interface AdminFailStoryDeletionJobRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminFailStoryDeletionJobVariables): MutationRef<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;
}
export const adminFailStoryDeletionJobRef: AdminFailStoryDeletionJobRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminFailStoryDeletionJob(dc: DataConnect, vars: AdminFailStoryDeletionJobVariables): MutationPromise<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;

interface AdminFailStoryDeletionJobRef {
  ...
  (dc: DataConnect, vars: AdminFailStoryDeletionJobVariables): MutationRef<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;
}
export const adminFailStoryDeletionJobRef: AdminFailStoryDeletionJobRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminFailStoryDeletionJobRef:
```typescript
const name = adminFailStoryDeletionJobRef.operationName;
console.log(name);
```

### Variables
The `AdminFailStoryDeletionJob` mutation requires an argument of type `AdminFailStoryDeletionJobVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminFailStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
  stage: StoryDeletionStageKind;
  lastError: string;
}
```
### Return Type
Recall that executing the `AdminFailStoryDeletionJob` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminFailStoryDeletionJobData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminFailStoryDeletionJobData {
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
}
```
### Using `AdminFailStoryDeletionJob`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminFailStoryDeletionJob, AdminFailStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminFailStoryDeletionJob` mutation requires an argument of type `AdminFailStoryDeletionJobVariables`:
const adminFailStoryDeletionJobVars: AdminFailStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
  stage: ..., 
  lastError: ..., 
};

// Call the `adminFailStoryDeletionJob()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminFailStoryDeletionJob(adminFailStoryDeletionJobVars);
// Variables can be defined inline as well.
const { data } = await adminFailStoryDeletionJob({ jobId: ..., leaseOwner: ..., stage: ..., lastError: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminFailStoryDeletionJob(dataConnect, adminFailStoryDeletionJobVars);

console.log(data.storyDeletionStage_update);
console.log(data.storyDeletionJob_update);

// Or, you can use the `Promise` API.
adminFailStoryDeletionJob(adminFailStoryDeletionJobVars).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionStage_update);
  console.log(data.storyDeletionJob_update);
});
```

### Using `AdminFailStoryDeletionJob`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminFailStoryDeletionJobRef, AdminFailStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminFailStoryDeletionJob` mutation requires an argument of type `AdminFailStoryDeletionJobVariables`:
const adminFailStoryDeletionJobVars: AdminFailStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
  stage: ..., 
  lastError: ..., 
};

// Call the `adminFailStoryDeletionJobRef()` function to get a reference to the mutation.
const ref = adminFailStoryDeletionJobRef(adminFailStoryDeletionJobVars);
// Variables can be defined inline as well.
const ref = adminFailStoryDeletionJobRef({ jobId: ..., leaseOwner: ..., stage: ..., lastError: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminFailStoryDeletionJobRef(dataConnect, adminFailStoryDeletionJobVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storyDeletionStage_update);
console.log(data.storyDeletionJob_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionStage_update);
  console.log(data.storyDeletionJob_update);
});
```

## AdminAdvanceStoryDeletionJob
You can execute the `AdminAdvanceStoryDeletionJob` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminAdvanceStoryDeletionJob(vars: AdminAdvanceStoryDeletionJobVariables): MutationPromise<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;

interface AdminAdvanceStoryDeletionJobRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminAdvanceStoryDeletionJobVariables): MutationRef<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;
}
export const adminAdvanceStoryDeletionJobRef: AdminAdvanceStoryDeletionJobRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminAdvanceStoryDeletionJob(dc: DataConnect, vars: AdminAdvanceStoryDeletionJobVariables): MutationPromise<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;

interface AdminAdvanceStoryDeletionJobRef {
  ...
  (dc: DataConnect, vars: AdminAdvanceStoryDeletionJobVariables): MutationRef<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;
}
export const adminAdvanceStoryDeletionJobRef: AdminAdvanceStoryDeletionJobRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminAdvanceStoryDeletionJobRef:
```typescript
const name = adminAdvanceStoryDeletionJobRef.operationName;
console.log(name);
```

### Variables
The `AdminAdvanceStoryDeletionJob` mutation requires an argument of type `AdminAdvanceStoryDeletionJobVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminAdvanceStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
  completedStage: StoryDeletionStageKind;
  nextStage: StoryDeletionStageKind;
}
```
### Return Type
Recall that executing the `AdminAdvanceStoryDeletionJob` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminAdvanceStoryDeletionJobData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminAdvanceStoryDeletionJobData {
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
}
```
### Using `AdminAdvanceStoryDeletionJob`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminAdvanceStoryDeletionJob, AdminAdvanceStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminAdvanceStoryDeletionJob` mutation requires an argument of type `AdminAdvanceStoryDeletionJobVariables`:
const adminAdvanceStoryDeletionJobVars: AdminAdvanceStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
  completedStage: ..., 
  nextStage: ..., 
};

// Call the `adminAdvanceStoryDeletionJob()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminAdvanceStoryDeletionJob(adminAdvanceStoryDeletionJobVars);
// Variables can be defined inline as well.
const { data } = await adminAdvanceStoryDeletionJob({ jobId: ..., leaseOwner: ..., completedStage: ..., nextStage: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminAdvanceStoryDeletionJob(dataConnect, adminAdvanceStoryDeletionJobVars);

console.log(data.storyDeletionStage_update);
console.log(data.storyDeletionJob_update);

// Or, you can use the `Promise` API.
adminAdvanceStoryDeletionJob(adminAdvanceStoryDeletionJobVars).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionStage_update);
  console.log(data.storyDeletionJob_update);
});
```

### Using `AdminAdvanceStoryDeletionJob`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminAdvanceStoryDeletionJobRef, AdminAdvanceStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminAdvanceStoryDeletionJob` mutation requires an argument of type `AdminAdvanceStoryDeletionJobVariables`:
const adminAdvanceStoryDeletionJobVars: AdminAdvanceStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
  completedStage: ..., 
  nextStage: ..., 
};

// Call the `adminAdvanceStoryDeletionJobRef()` function to get a reference to the mutation.
const ref = adminAdvanceStoryDeletionJobRef(adminAdvanceStoryDeletionJobVars);
// Variables can be defined inline as well.
const ref = adminAdvanceStoryDeletionJobRef({ jobId: ..., leaseOwner: ..., completedStage: ..., nextStage: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminAdvanceStoryDeletionJobRef(dataConnect, adminAdvanceStoryDeletionJobVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storyDeletionStage_update);
console.log(data.storyDeletionJob_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionStage_update);
  console.log(data.storyDeletionJob_update);
});
```

## AdminCompleteStoryDeletionJob
You can execute the `AdminCompleteStoryDeletionJob` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminCompleteStoryDeletionJob(vars: AdminCompleteStoryDeletionJobVariables): MutationPromise<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;

interface AdminCompleteStoryDeletionJobRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCompleteStoryDeletionJobVariables): MutationRef<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;
}
export const adminCompleteStoryDeletionJobRef: AdminCompleteStoryDeletionJobRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminCompleteStoryDeletionJob(dc: DataConnect, vars: AdminCompleteStoryDeletionJobVariables): MutationPromise<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;

interface AdminCompleteStoryDeletionJobRef {
  ...
  (dc: DataConnect, vars: AdminCompleteStoryDeletionJobVariables): MutationRef<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;
}
export const adminCompleteStoryDeletionJobRef: AdminCompleteStoryDeletionJobRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminCompleteStoryDeletionJobRef:
```typescript
const name = adminCompleteStoryDeletionJobRef.operationName;
console.log(name);
```

### Variables
The `AdminCompleteStoryDeletionJob` mutation requires an argument of type `AdminCompleteStoryDeletionJobVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminCompleteStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
}
```
### Return Type
Recall that executing the `AdminCompleteStoryDeletionJob` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminCompleteStoryDeletionJobData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminCompleteStoryDeletionJobData {
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
}
```
### Using `AdminCompleteStoryDeletionJob`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminCompleteStoryDeletionJob, AdminCompleteStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCompleteStoryDeletionJob` mutation requires an argument of type `AdminCompleteStoryDeletionJobVariables`:
const adminCompleteStoryDeletionJobVars: AdminCompleteStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
};

// Call the `adminCompleteStoryDeletionJob()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminCompleteStoryDeletionJob(adminCompleteStoryDeletionJobVars);
// Variables can be defined inline as well.
const { data } = await adminCompleteStoryDeletionJob({ jobId: ..., leaseOwner: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminCompleteStoryDeletionJob(dataConnect, adminCompleteStoryDeletionJobVars);

console.log(data.storyDeletionStage_update);
console.log(data.storyDeletionJob_update);

// Or, you can use the `Promise` API.
adminCompleteStoryDeletionJob(adminCompleteStoryDeletionJobVars).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionStage_update);
  console.log(data.storyDeletionJob_update);
});
```

### Using `AdminCompleteStoryDeletionJob`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminCompleteStoryDeletionJobRef, AdminCompleteStoryDeletionJobVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCompleteStoryDeletionJob` mutation requires an argument of type `AdminCompleteStoryDeletionJobVariables`:
const adminCompleteStoryDeletionJobVars: AdminCompleteStoryDeletionJobVariables = {
  jobId: ..., 
  leaseOwner: ..., 
};

// Call the `adminCompleteStoryDeletionJobRef()` function to get a reference to the mutation.
const ref = adminCompleteStoryDeletionJobRef(adminCompleteStoryDeletionJobVars);
// Variables can be defined inline as well.
const ref = adminCompleteStoryDeletionJobRef({ jobId: ..., leaseOwner: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminCompleteStoryDeletionJobRef(dataConnect, adminCompleteStoryDeletionJobVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storyDeletionStage_update);
console.log(data.storyDeletionJob_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storyDeletionStage_update);
  console.log(data.storyDeletionJob_update);
});
```

## AdminPurgeExpiredStoryTombstone
You can execute the `AdminPurgeExpiredStoryTombstone` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminPurgeExpiredStoryTombstone(vars: AdminPurgeExpiredStoryTombstoneVariables): MutationPromise<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;

interface AdminPurgeExpiredStoryTombstoneRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminPurgeExpiredStoryTombstoneVariables): MutationRef<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;
}
export const adminPurgeExpiredStoryTombstoneRef: AdminPurgeExpiredStoryTombstoneRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminPurgeExpiredStoryTombstone(dc: DataConnect, vars: AdminPurgeExpiredStoryTombstoneVariables): MutationPromise<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;

interface AdminPurgeExpiredStoryTombstoneRef {
  ...
  (dc: DataConnect, vars: AdminPurgeExpiredStoryTombstoneVariables): MutationRef<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;
}
export const adminPurgeExpiredStoryTombstoneRef: AdminPurgeExpiredStoryTombstoneRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminPurgeExpiredStoryTombstoneRef:
```typescript
const name = adminPurgeExpiredStoryTombstoneRef.operationName;
console.log(name);
```

### Variables
The `AdminPurgeExpiredStoryTombstone` mutation requires an argument of type `AdminPurgeExpiredStoryTombstoneVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminPurgeExpiredStoryTombstoneVariables {
  jobId: UUIDString;
  storyId: UUIDString;
  completedBefore: TimestampString;
}
```
### Return Type
Recall that executing the `AdminPurgeExpiredStoryTombstone` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminPurgeExpiredStoryTombstoneData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminPurgeExpiredStoryTombstoneData {
  eligibleTombstone?: unknown | null;
  story_delete?: Story_Key | null;
}
```
### Using `AdminPurgeExpiredStoryTombstone`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminPurgeExpiredStoryTombstone, AdminPurgeExpiredStoryTombstoneVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminPurgeExpiredStoryTombstone` mutation requires an argument of type `AdminPurgeExpiredStoryTombstoneVariables`:
const adminPurgeExpiredStoryTombstoneVars: AdminPurgeExpiredStoryTombstoneVariables = {
  jobId: ..., 
  storyId: ..., 
  completedBefore: ..., 
};

// Call the `adminPurgeExpiredStoryTombstone()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminPurgeExpiredStoryTombstone(adminPurgeExpiredStoryTombstoneVars);
// Variables can be defined inline as well.
const { data } = await adminPurgeExpiredStoryTombstone({ jobId: ..., storyId: ..., completedBefore: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminPurgeExpiredStoryTombstone(dataConnect, adminPurgeExpiredStoryTombstoneVars);

console.log(data.eligibleTombstone);
console.log(data.story_delete);

// Or, you can use the `Promise` API.
adminPurgeExpiredStoryTombstone(adminPurgeExpiredStoryTombstoneVars).then((response) => {
  const data = response.data;
  console.log(data.eligibleTombstone);
  console.log(data.story_delete);
});
```

### Using `AdminPurgeExpiredStoryTombstone`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminPurgeExpiredStoryTombstoneRef, AdminPurgeExpiredStoryTombstoneVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminPurgeExpiredStoryTombstone` mutation requires an argument of type `AdminPurgeExpiredStoryTombstoneVariables`:
const adminPurgeExpiredStoryTombstoneVars: AdminPurgeExpiredStoryTombstoneVariables = {
  jobId: ..., 
  storyId: ..., 
  completedBefore: ..., 
};

// Call the `adminPurgeExpiredStoryTombstoneRef()` function to get a reference to the mutation.
const ref = adminPurgeExpiredStoryTombstoneRef(adminPurgeExpiredStoryTombstoneVars);
// Variables can be defined inline as well.
const ref = adminPurgeExpiredStoryTombstoneRef({ jobId: ..., storyId: ..., completedBefore: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminPurgeExpiredStoryTombstoneRef(dataConnect, adminPurgeExpiredStoryTombstoneVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.eligibleTombstone);
console.log(data.story_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.eligibleTombstone);
  console.log(data.story_delete);
});
```

## AdminReserveStorageQuota
You can execute the `AdminReserveStorageQuota` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminReserveStorageQuota(vars: AdminReserveStorageQuotaVariables): MutationPromise<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;

interface AdminReserveStorageQuotaRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReserveStorageQuotaVariables): MutationRef<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;
}
export const adminReserveStorageQuotaRef: AdminReserveStorageQuotaRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminReserveStorageQuota(dc: DataConnect, vars: AdminReserveStorageQuotaVariables): MutationPromise<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;

interface AdminReserveStorageQuotaRef {
  ...
  (dc: DataConnect, vars: AdminReserveStorageQuotaVariables): MutationRef<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;
}
export const adminReserveStorageQuotaRef: AdminReserveStorageQuotaRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminReserveStorageQuotaRef:
```typescript
const name = adminReserveStorageQuotaRef.operationName;
console.log(name);
```

### Variables
The `AdminReserveStorageQuota` mutation requires an argument of type `AdminReserveStorageQuotaVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminReserveStorageQuotaVariables {
  reservationId: UUIDString;
  ownerUid: string;
  storyId?: UUIDString | null;
  idempotencyKey: string;
  requestedBytes: Int64String;
  hardLimitBytes: Int64String;
  expiresAt: TimestampString;
}
```
### Return Type
Recall that executing the `AdminReserveStorageQuota` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminReserveStorageQuotaData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminReserveStorageQuotaData {
  quota?: unknown | null;
  storageQuotaReservation_insert: StorageQuotaReservation_Key;
}
```
### Using `AdminReserveStorageQuota`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminReserveStorageQuota, AdminReserveStorageQuotaVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReserveStorageQuota` mutation requires an argument of type `AdminReserveStorageQuotaVariables`:
const adminReserveStorageQuotaVars: AdminReserveStorageQuotaVariables = {
  reservationId: ..., 
  ownerUid: ..., 
  storyId: ..., // optional
  idempotencyKey: ..., 
  requestedBytes: ..., 
  hardLimitBytes: ..., 
  expiresAt: ..., 
};

// Call the `adminReserveStorageQuota()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminReserveStorageQuota(adminReserveStorageQuotaVars);
// Variables can be defined inline as well.
const { data } = await adminReserveStorageQuota({ reservationId: ..., ownerUid: ..., storyId: ..., idempotencyKey: ..., requestedBytes: ..., hardLimitBytes: ..., expiresAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminReserveStorageQuota(dataConnect, adminReserveStorageQuotaVars);

console.log(data.quota);
console.log(data.storageQuotaReservation_insert);

// Or, you can use the `Promise` API.
adminReserveStorageQuota(adminReserveStorageQuotaVars).then((response) => {
  const data = response.data;
  console.log(data.quota);
  console.log(data.storageQuotaReservation_insert);
});
```

### Using `AdminReserveStorageQuota`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminReserveStorageQuotaRef, AdminReserveStorageQuotaVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReserveStorageQuota` mutation requires an argument of type `AdminReserveStorageQuotaVariables`:
const adminReserveStorageQuotaVars: AdminReserveStorageQuotaVariables = {
  reservationId: ..., 
  ownerUid: ..., 
  storyId: ..., // optional
  idempotencyKey: ..., 
  requestedBytes: ..., 
  hardLimitBytes: ..., 
  expiresAt: ..., 
};

// Call the `adminReserveStorageQuotaRef()` function to get a reference to the mutation.
const ref = adminReserveStorageQuotaRef(adminReserveStorageQuotaVars);
// Variables can be defined inline as well.
const ref = adminReserveStorageQuotaRef({ reservationId: ..., ownerUid: ..., storyId: ..., idempotencyKey: ..., requestedBytes: ..., hardLimitBytes: ..., expiresAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminReserveStorageQuotaRef(dataConnect, adminReserveStorageQuotaVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.quota);
console.log(data.storageQuotaReservation_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.quota);
  console.log(data.storageQuotaReservation_insert);
});
```

## AdminReleaseStorageQuotaReservation
You can execute the `AdminReleaseStorageQuotaReservation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminReleaseStorageQuotaReservation(vars: AdminReleaseStorageQuotaReservationVariables): MutationPromise<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;

interface AdminReleaseStorageQuotaReservationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReleaseStorageQuotaReservationVariables): MutationRef<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;
}
export const adminReleaseStorageQuotaReservationRef: AdminReleaseStorageQuotaReservationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminReleaseStorageQuotaReservation(dc: DataConnect, vars: AdminReleaseStorageQuotaReservationVariables): MutationPromise<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;

interface AdminReleaseStorageQuotaReservationRef {
  ...
  (dc: DataConnect, vars: AdminReleaseStorageQuotaReservationVariables): MutationRef<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;
}
export const adminReleaseStorageQuotaReservationRef: AdminReleaseStorageQuotaReservationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminReleaseStorageQuotaReservationRef:
```typescript
const name = adminReleaseStorageQuotaReservationRef.operationName;
console.log(name);
```

### Variables
The `AdminReleaseStorageQuotaReservation` mutation requires an argument of type `AdminReleaseStorageQuotaReservationVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminReleaseStorageQuotaReservationVariables {
  reservationId: UUIDString;
  ownerUid: string;
}
```
### Return Type
Recall that executing the `AdminReleaseStorageQuotaReservation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminReleaseStorageQuotaReservationData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminReleaseStorageQuotaReservationData {
  released?: number | null;
}
```
### Using `AdminReleaseStorageQuotaReservation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminReleaseStorageQuotaReservation, AdminReleaseStorageQuotaReservationVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReleaseStorageQuotaReservation` mutation requires an argument of type `AdminReleaseStorageQuotaReservationVariables`:
const adminReleaseStorageQuotaReservationVars: AdminReleaseStorageQuotaReservationVariables = {
  reservationId: ..., 
  ownerUid: ..., 
};

// Call the `adminReleaseStorageQuotaReservation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminReleaseStorageQuotaReservation(adminReleaseStorageQuotaReservationVars);
// Variables can be defined inline as well.
const { data } = await adminReleaseStorageQuotaReservation({ reservationId: ..., ownerUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminReleaseStorageQuotaReservation(dataConnect, adminReleaseStorageQuotaReservationVars);

console.log(data.released);

// Or, you can use the `Promise` API.
adminReleaseStorageQuotaReservation(adminReleaseStorageQuotaReservationVars).then((response) => {
  const data = response.data;
  console.log(data.released);
});
```

### Using `AdminReleaseStorageQuotaReservation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminReleaseStorageQuotaReservationRef, AdminReleaseStorageQuotaReservationVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReleaseStorageQuotaReservation` mutation requires an argument of type `AdminReleaseStorageQuotaReservationVariables`:
const adminReleaseStorageQuotaReservationVars: AdminReleaseStorageQuotaReservationVariables = {
  reservationId: ..., 
  ownerUid: ..., 
};

// Call the `adminReleaseStorageQuotaReservationRef()` function to get a reference to the mutation.
const ref = adminReleaseStorageQuotaReservationRef(adminReleaseStorageQuotaReservationVars);
// Variables can be defined inline as well.
const ref = adminReleaseStorageQuotaReservationRef({ reservationId: ..., ownerUid: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminReleaseStorageQuotaReservationRef(dataConnect, adminReleaseStorageQuotaReservationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.released);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.released);
});
```

## AdminReserveMediaAssetIdempotent
You can execute the `AdminReserveMediaAssetIdempotent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminReserveMediaAssetIdempotent(vars: AdminReserveMediaAssetIdempotentVariables): MutationPromise<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;

interface AdminReserveMediaAssetIdempotentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReserveMediaAssetIdempotentVariables): MutationRef<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;
}
export const adminReserveMediaAssetIdempotentRef: AdminReserveMediaAssetIdempotentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminReserveMediaAssetIdempotent(dc: DataConnect, vars: AdminReserveMediaAssetIdempotentVariables): MutationPromise<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;

interface AdminReserveMediaAssetIdempotentRef {
  ...
  (dc: DataConnect, vars: AdminReserveMediaAssetIdempotentVariables): MutationRef<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;
}
export const adminReserveMediaAssetIdempotentRef: AdminReserveMediaAssetIdempotentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminReserveMediaAssetIdempotentRef:
```typescript
const name = adminReserveMediaAssetIdempotentRef.operationName;
console.log(name);
```

### Variables
The `AdminReserveMediaAssetIdempotent` mutation requires an argument of type `AdminReserveMediaAssetIdempotentVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminReserveMediaAssetIdempotentVariables {
  id: UUIDString;
  ownerUid: string;
  storyId?: UUIDString | null;
  generationJobId?: UUIDString | null;
  replacesAssetId?: UUIDString | null;
  quotaReservationId: UUIDString;
  idempotencyKey: string;
  requestHash: string;
  assetType: MediaAssetType;
  purpose: string;
  visibility: MediaVisibility;
  bucket: string;
  objectKey: string;
  originalFilename?: string | null;
  mimeType: string;
  extension: string;
  byteSize: Int64String;
  checksumSha256: string;
  width?: number | null;
  height?: number | null;
  durationMs?: Int64String | null;
  version: number;
  cacheControl: string;
  sourceKind: string;
}
```
### Return Type
Recall that executing the `AdminReserveMediaAssetIdempotent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminReserveMediaAssetIdempotentData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminReserveMediaAssetIdempotentData {
  mediaAsset_insert: MediaAsset_Key;
  storageQuotaReservation_update?: StorageQuotaReservation_Key | null;
  mediaUploadAttempt_insert: MediaUploadAttempt_Key;
  mediaUploadReceipt_insert: MediaUploadReceipt_Key;
}
```
### Using `AdminReserveMediaAssetIdempotent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminReserveMediaAssetIdempotent, AdminReserveMediaAssetIdempotentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReserveMediaAssetIdempotent` mutation requires an argument of type `AdminReserveMediaAssetIdempotentVariables`:
const adminReserveMediaAssetIdempotentVars: AdminReserveMediaAssetIdempotentVariables = {
  id: ..., 
  ownerUid: ..., 
  storyId: ..., // optional
  generationJobId: ..., // optional
  replacesAssetId: ..., // optional
  quotaReservationId: ..., 
  idempotencyKey: ..., 
  requestHash: ..., 
  assetType: ..., 
  purpose: ..., 
  visibility: ..., 
  bucket: ..., 
  objectKey: ..., 
  originalFilename: ..., // optional
  mimeType: ..., 
  extension: ..., 
  byteSize: ..., 
  checksumSha256: ..., 
  width: ..., // optional
  height: ..., // optional
  durationMs: ..., // optional
  version: ..., 
  cacheControl: ..., 
  sourceKind: ..., 
};

// Call the `adminReserveMediaAssetIdempotent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminReserveMediaAssetIdempotent(adminReserveMediaAssetIdempotentVars);
// Variables can be defined inline as well.
const { data } = await adminReserveMediaAssetIdempotent({ id: ..., ownerUid: ..., storyId: ..., generationJobId: ..., replacesAssetId: ..., quotaReservationId: ..., idempotencyKey: ..., requestHash: ..., assetType: ..., purpose: ..., visibility: ..., bucket: ..., objectKey: ..., originalFilename: ..., mimeType: ..., extension: ..., byteSize: ..., checksumSha256: ..., width: ..., height: ..., durationMs: ..., version: ..., cacheControl: ..., sourceKind: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminReserveMediaAssetIdempotent(dataConnect, adminReserveMediaAssetIdempotentVars);

console.log(data.mediaAsset_insert);
console.log(data.storageQuotaReservation_update);
console.log(data.mediaUploadAttempt_insert);
console.log(data.mediaUploadReceipt_insert);

// Or, you can use the `Promise` API.
adminReserveMediaAssetIdempotent(adminReserveMediaAssetIdempotentVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_insert);
  console.log(data.storageQuotaReservation_update);
  console.log(data.mediaUploadAttempt_insert);
  console.log(data.mediaUploadReceipt_insert);
});
```

### Using `AdminReserveMediaAssetIdempotent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminReserveMediaAssetIdempotentRef, AdminReserveMediaAssetIdempotentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminReserveMediaAssetIdempotent` mutation requires an argument of type `AdminReserveMediaAssetIdempotentVariables`:
const adminReserveMediaAssetIdempotentVars: AdminReserveMediaAssetIdempotentVariables = {
  id: ..., 
  ownerUid: ..., 
  storyId: ..., // optional
  generationJobId: ..., // optional
  replacesAssetId: ..., // optional
  quotaReservationId: ..., 
  idempotencyKey: ..., 
  requestHash: ..., 
  assetType: ..., 
  purpose: ..., 
  visibility: ..., 
  bucket: ..., 
  objectKey: ..., 
  originalFilename: ..., // optional
  mimeType: ..., 
  extension: ..., 
  byteSize: ..., 
  checksumSha256: ..., 
  width: ..., // optional
  height: ..., // optional
  durationMs: ..., // optional
  version: ..., 
  cacheControl: ..., 
  sourceKind: ..., 
};

// Call the `adminReserveMediaAssetIdempotentRef()` function to get a reference to the mutation.
const ref = adminReserveMediaAssetIdempotentRef(adminReserveMediaAssetIdempotentVars);
// Variables can be defined inline as well.
const ref = adminReserveMediaAssetIdempotentRef({ id: ..., ownerUid: ..., storyId: ..., generationJobId: ..., replacesAssetId: ..., quotaReservationId: ..., idempotencyKey: ..., requestHash: ..., assetType: ..., purpose: ..., visibility: ..., bucket: ..., objectKey: ..., originalFilename: ..., mimeType: ..., extension: ..., byteSize: ..., checksumSha256: ..., width: ..., height: ..., durationMs: ..., version: ..., cacheControl: ..., sourceKind: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminReserveMediaAssetIdempotentRef(dataConnect, adminReserveMediaAssetIdempotentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaAsset_insert);
console.log(data.storageQuotaReservation_update);
console.log(data.mediaUploadAttempt_insert);
console.log(data.mediaUploadReceipt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAsset_insert);
  console.log(data.storageQuotaReservation_update);
  console.log(data.mediaUploadAttempt_insert);
  console.log(data.mediaUploadReceipt_insert);
});
```

## AdminCommitMediaAssetToSlot
You can execute the `AdminCommitMediaAssetToSlot` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminCommitMediaAssetToSlot(vars: AdminCommitMediaAssetToSlotVariables): MutationPromise<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;

interface AdminCommitMediaAssetToSlotRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCommitMediaAssetToSlotVariables): MutationRef<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;
}
export const adminCommitMediaAssetToSlotRef: AdminCommitMediaAssetToSlotRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminCommitMediaAssetToSlot(dc: DataConnect, vars: AdminCommitMediaAssetToSlotVariables): MutationPromise<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;

interface AdminCommitMediaAssetToSlotRef {
  ...
  (dc: DataConnect, vars: AdminCommitMediaAssetToSlotVariables): MutationRef<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;
}
export const adminCommitMediaAssetToSlotRef: AdminCommitMediaAssetToSlotRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminCommitMediaAssetToSlotRef:
```typescript
const name = adminCommitMediaAssetToSlotRef.operationName;
console.log(name);
```

### Variables
The `AdminCommitMediaAssetToSlot` mutation requires an argument of type `AdminCommitMediaAssetToSlotVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminCommitMediaAssetToSlotVariables {
  id: UUIDString;
  ownerUid: string;
  quotaReservationId: UUIDString;
  idempotencyKey: string;
  etag?: string | null;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  attachmentId: UUIDString;
  historyEntityType?: string | null;
  clientHistoryId?: string | null;
  promptUsed?: string | null;
  chapterNumber?: number | null;
  arcTitle?: string | null;
  label?: string | null;
  position: number;
  expectedCurrentAssetId?: UUIDString | null;
  expectedSlotVersion?: Int64String | null;
  newSlotVersion: Int64String;
}
```
### Return Type
Recall that executing the `AdminCommitMediaAssetToSlot` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminCommitMediaAssetToSlotData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminCommitMediaAssetToSlotData {
  mediaAttachment_updateMany: number;
  mediaAsset_update?: MediaAsset_Key | null;
  mediaAttachment_upsert: MediaAttachment_Key;
  mediaSlot_upsert: MediaSlot_Key;
  mediaUploadAttempt_updateMany: number;
  mediaUploadReceipt_update?: MediaUploadReceipt_Key | null;
  committedQuota?: number | null;
}
```
### Using `AdminCommitMediaAssetToSlot`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminCommitMediaAssetToSlot, AdminCommitMediaAssetToSlotVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCommitMediaAssetToSlot` mutation requires an argument of type `AdminCommitMediaAssetToSlotVariables`:
const adminCommitMediaAssetToSlotVars: AdminCommitMediaAssetToSlotVariables = {
  id: ..., 
  ownerUid: ..., 
  quotaReservationId: ..., 
  idempotencyKey: ..., 
  etag: ..., // optional
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  attachmentId: ..., 
  historyEntityType: ..., // optional
  clientHistoryId: ..., // optional
  promptUsed: ..., // optional
  chapterNumber: ..., // optional
  arcTitle: ..., // optional
  label: ..., // optional
  position: ..., 
  expectedCurrentAssetId: ..., // optional
  expectedSlotVersion: ..., // optional
  newSlotVersion: ..., 
};

// Call the `adminCommitMediaAssetToSlot()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminCommitMediaAssetToSlot(adminCommitMediaAssetToSlotVars);
// Variables can be defined inline as well.
const { data } = await adminCommitMediaAssetToSlot({ id: ..., ownerUid: ..., quotaReservationId: ..., idempotencyKey: ..., etag: ..., storyId: ..., chapterId: ..., entityId: ..., targetKind: ..., targetKey: ..., purpose: ..., attachmentId: ..., historyEntityType: ..., clientHistoryId: ..., promptUsed: ..., chapterNumber: ..., arcTitle: ..., label: ..., position: ..., expectedCurrentAssetId: ..., expectedSlotVersion: ..., newSlotVersion: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminCommitMediaAssetToSlot(dataConnect, adminCommitMediaAssetToSlotVars);

console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAsset_update);
console.log(data.mediaAttachment_upsert);
console.log(data.mediaSlot_upsert);
console.log(data.mediaUploadAttempt_updateMany);
console.log(data.mediaUploadReceipt_update);
console.log(data.committedQuota);

// Or, you can use the `Promise` API.
adminCommitMediaAssetToSlot(adminCommitMediaAssetToSlotVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAsset_update);
  console.log(data.mediaAttachment_upsert);
  console.log(data.mediaSlot_upsert);
  console.log(data.mediaUploadAttempt_updateMany);
  console.log(data.mediaUploadReceipt_update);
  console.log(data.committedQuota);
});
```

### Using `AdminCommitMediaAssetToSlot`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminCommitMediaAssetToSlotRef, AdminCommitMediaAssetToSlotVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCommitMediaAssetToSlot` mutation requires an argument of type `AdminCommitMediaAssetToSlotVariables`:
const adminCommitMediaAssetToSlotVars: AdminCommitMediaAssetToSlotVariables = {
  id: ..., 
  ownerUid: ..., 
  quotaReservationId: ..., 
  idempotencyKey: ..., 
  etag: ..., // optional
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  attachmentId: ..., 
  historyEntityType: ..., // optional
  clientHistoryId: ..., // optional
  promptUsed: ..., // optional
  chapterNumber: ..., // optional
  arcTitle: ..., // optional
  label: ..., // optional
  position: ..., 
  expectedCurrentAssetId: ..., // optional
  expectedSlotVersion: ..., // optional
  newSlotVersion: ..., 
};

// Call the `adminCommitMediaAssetToSlotRef()` function to get a reference to the mutation.
const ref = adminCommitMediaAssetToSlotRef(adminCommitMediaAssetToSlotVars);
// Variables can be defined inline as well.
const ref = adminCommitMediaAssetToSlotRef({ id: ..., ownerUid: ..., quotaReservationId: ..., idempotencyKey: ..., etag: ..., storyId: ..., chapterId: ..., entityId: ..., targetKind: ..., targetKey: ..., purpose: ..., attachmentId: ..., historyEntityType: ..., clientHistoryId: ..., promptUsed: ..., chapterNumber: ..., arcTitle: ..., label: ..., position: ..., expectedCurrentAssetId: ..., expectedSlotVersion: ..., newSlotVersion: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminCommitMediaAssetToSlotRef(dataConnect, adminCommitMediaAssetToSlotVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAsset_update);
console.log(data.mediaAttachment_upsert);
console.log(data.mediaSlot_upsert);
console.log(data.mediaUploadAttempt_updateMany);
console.log(data.mediaUploadReceipt_update);
console.log(data.committedQuota);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAsset_update);
  console.log(data.mediaAttachment_upsert);
  console.log(data.mediaSlot_upsert);
  console.log(data.mediaUploadAttempt_updateMany);
  console.log(data.mediaUploadReceipt_update);
  console.log(data.committedQuota);
});
```

## AdminSelectOwnedMediaSlotAsset
You can execute the `AdminSelectOwnedMediaSlotAsset` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminSelectOwnedMediaSlotAsset(vars: AdminSelectOwnedMediaSlotAssetVariables): MutationPromise<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;

interface AdminSelectOwnedMediaSlotAssetRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminSelectOwnedMediaSlotAssetVariables): MutationRef<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;
}
export const adminSelectOwnedMediaSlotAssetRef: AdminSelectOwnedMediaSlotAssetRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminSelectOwnedMediaSlotAsset(dc: DataConnect, vars: AdminSelectOwnedMediaSlotAssetVariables): MutationPromise<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;

interface AdminSelectOwnedMediaSlotAssetRef {
  ...
  (dc: DataConnect, vars: AdminSelectOwnedMediaSlotAssetVariables): MutationRef<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;
}
export const adminSelectOwnedMediaSlotAssetRef: AdminSelectOwnedMediaSlotAssetRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminSelectOwnedMediaSlotAssetRef:
```typescript
const name = adminSelectOwnedMediaSlotAssetRef.operationName;
console.log(name);
```

### Variables
The `AdminSelectOwnedMediaSlotAsset` mutation requires an argument of type `AdminSelectOwnedMediaSlotAssetVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminSelectOwnedMediaSlotAssetVariables {
  assetId: UUIDString;
  ownerUid: string;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  attachmentId: UUIDString;
  expectedCurrentAssetId?: UUIDString | null;
  expectedSlotVersion?: Int64String | null;
  newSlotVersion: Int64String;
}
```
### Return Type
Recall that executing the `AdminSelectOwnedMediaSlotAsset` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminSelectOwnedMediaSlotAssetData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminSelectOwnedMediaSlotAssetData {
  mediaAttachment_updateMany: number;
  mediaAttachment_update?: MediaAttachment_Key | null;
  mediaSlot_update?: MediaSlot_Key | null;
}
```
### Using `AdminSelectOwnedMediaSlotAsset`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminSelectOwnedMediaSlotAsset, AdminSelectOwnedMediaSlotAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminSelectOwnedMediaSlotAsset` mutation requires an argument of type `AdminSelectOwnedMediaSlotAssetVariables`:
const adminSelectOwnedMediaSlotAssetVars: AdminSelectOwnedMediaSlotAssetVariables = {
  assetId: ..., 
  ownerUid: ..., 
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  attachmentId: ..., 
  expectedCurrentAssetId: ..., // optional
  expectedSlotVersion: ..., // optional
  newSlotVersion: ..., 
};

// Call the `adminSelectOwnedMediaSlotAsset()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminSelectOwnedMediaSlotAsset(adminSelectOwnedMediaSlotAssetVars);
// Variables can be defined inline as well.
const { data } = await adminSelectOwnedMediaSlotAsset({ assetId: ..., ownerUid: ..., storyId: ..., chapterId: ..., entityId: ..., targetKind: ..., targetKey: ..., purpose: ..., attachmentId: ..., expectedCurrentAssetId: ..., expectedSlotVersion: ..., newSlotVersion: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminSelectOwnedMediaSlotAsset(dataConnect, adminSelectOwnedMediaSlotAssetVars);

console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAttachment_update);
console.log(data.mediaSlot_update);

// Or, you can use the `Promise` API.
adminSelectOwnedMediaSlotAsset(adminSelectOwnedMediaSlotAssetVars).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAttachment_update);
  console.log(data.mediaSlot_update);
});
```

### Using `AdminSelectOwnedMediaSlotAsset`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminSelectOwnedMediaSlotAssetRef, AdminSelectOwnedMediaSlotAssetVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminSelectOwnedMediaSlotAsset` mutation requires an argument of type `AdminSelectOwnedMediaSlotAssetVariables`:
const adminSelectOwnedMediaSlotAssetVars: AdminSelectOwnedMediaSlotAssetVariables = {
  assetId: ..., 
  ownerUid: ..., 
  storyId: ..., // optional
  chapterId: ..., // optional
  entityId: ..., // optional
  targetKind: ..., 
  targetKey: ..., 
  purpose: ..., 
  attachmentId: ..., 
  expectedCurrentAssetId: ..., // optional
  expectedSlotVersion: ..., // optional
  newSlotVersion: ..., 
};

// Call the `adminSelectOwnedMediaSlotAssetRef()` function to get a reference to the mutation.
const ref = adminSelectOwnedMediaSlotAssetRef(adminSelectOwnedMediaSlotAssetVars);
// Variables can be defined inline as well.
const ref = adminSelectOwnedMediaSlotAssetRef({ assetId: ..., ownerUid: ..., storyId: ..., chapterId: ..., entityId: ..., targetKind: ..., targetKey: ..., purpose: ..., attachmentId: ..., expectedCurrentAssetId: ..., expectedSlotVersion: ..., newSlotVersion: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminSelectOwnedMediaSlotAssetRef(dataConnect, adminSelectOwnedMediaSlotAssetVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAttachment_update);
console.log(data.mediaSlot_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAttachment_update);
  console.log(data.mediaSlot_update);
});
```

## AdminSelectUserPortrait
You can execute the `AdminSelectUserPortrait` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminSelectUserPortrait(vars: AdminSelectUserPortraitVariables): MutationPromise<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;

interface AdminSelectUserPortraitRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminSelectUserPortraitVariables): MutationRef<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;
}
export const adminSelectUserPortraitRef: AdminSelectUserPortraitRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminSelectUserPortrait(dc: DataConnect, vars: AdminSelectUserPortraitVariables): MutationPromise<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;

interface AdminSelectUserPortraitRef {
  ...
  (dc: DataConnect, vars: AdminSelectUserPortraitVariables): MutationRef<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;
}
export const adminSelectUserPortraitRef: AdminSelectUserPortraitRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminSelectUserPortraitRef:
```typescript
const name = adminSelectUserPortraitRef.operationName;
console.log(name);
```

### Variables
The `AdminSelectUserPortrait` mutation requires an argument of type `AdminSelectUserPortraitVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminSelectUserPortraitVariables {
  ownerUid: string;
  assetId: UUIDString;
  idempotencyKey: string;
  expectedActivePortraitAssetId?: UUIDString | null;
  expectedSyncRevision?: string | null;
  newSyncRevision: string;
  newRevision: Int64String;
  prompt?: string | null;
  description?: string | null;
  daoRank?: string | null;
  daoXp?: Int64String | null;
  powerStage?: string | null;
  equippedInventoryItemId?: UUIDString | null;
  usedReferenceImage: boolean;
  frameId?: string | null;
  glowId?: string | null;
  bannerId?: string | null;
  effectIds?: string[] | null;
}
```
### Return Type
Recall that executing the `AdminSelectUserPortrait` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminSelectUserPortraitData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminSelectUserPortraitData {
  profileVersionGuard?: unknown | null;
  userPortrait_updateMany: number;
  userPortrait_upsert: UserPortrait_Key;
  userProfile_update?: UserProfile_Key | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}
```
### Using `AdminSelectUserPortrait`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminSelectUserPortrait, AdminSelectUserPortraitVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminSelectUserPortrait` mutation requires an argument of type `AdminSelectUserPortraitVariables`:
const adminSelectUserPortraitVars: AdminSelectUserPortraitVariables = {
  ownerUid: ..., 
  assetId: ..., 
  idempotencyKey: ..., 
  expectedActivePortraitAssetId: ..., // optional
  expectedSyncRevision: ..., // optional
  newSyncRevision: ..., 
  newRevision: ..., 
  prompt: ..., // optional
  description: ..., // optional
  daoRank: ..., // optional
  daoXp: ..., // optional
  powerStage: ..., // optional
  equippedInventoryItemId: ..., // optional
  usedReferenceImage: ..., 
  frameId: ..., // optional
  glowId: ..., // optional
  bannerId: ..., // optional
  effectIds: ..., // optional
};

// Call the `adminSelectUserPortrait()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminSelectUserPortrait(adminSelectUserPortraitVars);
// Variables can be defined inline as well.
const { data } = await adminSelectUserPortrait({ ownerUid: ..., assetId: ..., idempotencyKey: ..., expectedActivePortraitAssetId: ..., expectedSyncRevision: ..., newSyncRevision: ..., newRevision: ..., prompt: ..., description: ..., daoRank: ..., daoXp: ..., powerStage: ..., equippedInventoryItemId: ..., usedReferenceImage: ..., frameId: ..., glowId: ..., bannerId: ..., effectIds: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminSelectUserPortrait(dataConnect, adminSelectUserPortraitVars);

console.log(data.profileVersionGuard);
console.log(data.userPortrait_updateMany);
console.log(data.userPortrait_upsert);
console.log(data.userProfile_update);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
adminSelectUserPortrait(adminSelectUserPortraitVars).then((response) => {
  const data = response.data;
  console.log(data.profileVersionGuard);
  console.log(data.userPortrait_updateMany);
  console.log(data.userPortrait_upsert);
  console.log(data.userProfile_update);
  console.log(data.persistenceReceipt_insert);
});
```

### Using `AdminSelectUserPortrait`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminSelectUserPortraitRef, AdminSelectUserPortraitVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminSelectUserPortrait` mutation requires an argument of type `AdminSelectUserPortraitVariables`:
const adminSelectUserPortraitVars: AdminSelectUserPortraitVariables = {
  ownerUid: ..., 
  assetId: ..., 
  idempotencyKey: ..., 
  expectedActivePortraitAssetId: ..., // optional
  expectedSyncRevision: ..., // optional
  newSyncRevision: ..., 
  newRevision: ..., 
  prompt: ..., // optional
  description: ..., // optional
  daoRank: ..., // optional
  daoXp: ..., // optional
  powerStage: ..., // optional
  equippedInventoryItemId: ..., // optional
  usedReferenceImage: ..., 
  frameId: ..., // optional
  glowId: ..., // optional
  bannerId: ..., // optional
  effectIds: ..., // optional
};

// Call the `adminSelectUserPortraitRef()` function to get a reference to the mutation.
const ref = adminSelectUserPortraitRef(adminSelectUserPortraitVars);
// Variables can be defined inline as well.
const ref = adminSelectUserPortraitRef({ ownerUid: ..., assetId: ..., idempotencyKey: ..., expectedActivePortraitAssetId: ..., expectedSyncRevision: ..., newSyncRevision: ..., newRevision: ..., prompt: ..., description: ..., daoRank: ..., daoXp: ..., powerStage: ..., equippedInventoryItemId: ..., usedReferenceImage: ..., frameId: ..., glowId: ..., bannerId: ..., effectIds: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminSelectUserPortraitRef(dataConnect, adminSelectUserPortraitVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.profileVersionGuard);
console.log(data.userPortrait_updateMany);
console.log(data.userPortrait_upsert);
console.log(data.userProfile_update);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.profileVersionGuard);
  console.log(data.userPortrait_updateMany);
  console.log(data.userPortrait_upsert);
  console.log(data.userProfile_update);
  console.log(data.persistenceReceipt_insert);
});
```

## AdminEnsureMediaDeletionIntent
You can execute the `AdminEnsureMediaDeletionIntent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminEnsureMediaDeletionIntent(vars: AdminEnsureMediaDeletionIntentVariables): MutationPromise<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;

interface AdminEnsureMediaDeletionIntentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminEnsureMediaDeletionIntentVariables): MutationRef<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;
}
export const adminEnsureMediaDeletionIntentRef: AdminEnsureMediaDeletionIntentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminEnsureMediaDeletionIntent(dc: DataConnect, vars: AdminEnsureMediaDeletionIntentVariables): MutationPromise<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;

interface AdminEnsureMediaDeletionIntentRef {
  ...
  (dc: DataConnect, vars: AdminEnsureMediaDeletionIntentVariables): MutationRef<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;
}
export const adminEnsureMediaDeletionIntentRef: AdminEnsureMediaDeletionIntentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminEnsureMediaDeletionIntentRef:
```typescript
const name = adminEnsureMediaDeletionIntentRef.operationName;
console.log(name);
```

### Variables
The `AdminEnsureMediaDeletionIntent` mutation requires an argument of type `AdminEnsureMediaDeletionIntentVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminEnsureMediaDeletionIntentVariables {
  taskId: UUIDString;
  ownerUid: string;
  assetId: UUIDString;
  storyId?: UUIDString | null;
  idempotencyKey: string;
  bucket: string;
  objectKey: string;
  reason: string;
}
```
### Return Type
Recall that executing the `AdminEnsureMediaDeletionIntent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminEnsureMediaDeletionIntentData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminEnsureMediaDeletionIntentData {
  mediaSlot_deleteMany: number;
  mediaAttachment_updateMany: number;
  mediaAsset_update?: MediaAsset_Key | null;
  mediaDeletionIntent_upsert: MediaDeletionIntent_Key;
  mediaCleanupTask_upsert: MediaCleanupTask_Key;
}
```
### Using `AdminEnsureMediaDeletionIntent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminEnsureMediaDeletionIntent, AdminEnsureMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminEnsureMediaDeletionIntent` mutation requires an argument of type `AdminEnsureMediaDeletionIntentVariables`:
const adminEnsureMediaDeletionIntentVars: AdminEnsureMediaDeletionIntentVariables = {
  taskId: ..., 
  ownerUid: ..., 
  assetId: ..., 
  storyId: ..., // optional
  idempotencyKey: ..., 
  bucket: ..., 
  objectKey: ..., 
  reason: ..., 
};

// Call the `adminEnsureMediaDeletionIntent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminEnsureMediaDeletionIntent(adminEnsureMediaDeletionIntentVars);
// Variables can be defined inline as well.
const { data } = await adminEnsureMediaDeletionIntent({ taskId: ..., ownerUid: ..., assetId: ..., storyId: ..., idempotencyKey: ..., bucket: ..., objectKey: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminEnsureMediaDeletionIntent(dataConnect, adminEnsureMediaDeletionIntentVars);

console.log(data.mediaSlot_deleteMany);
console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAsset_update);
console.log(data.mediaDeletionIntent_upsert);
console.log(data.mediaCleanupTask_upsert);

// Or, you can use the `Promise` API.
adminEnsureMediaDeletionIntent(adminEnsureMediaDeletionIntentVars).then((response) => {
  const data = response.data;
  console.log(data.mediaSlot_deleteMany);
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAsset_update);
  console.log(data.mediaDeletionIntent_upsert);
  console.log(data.mediaCleanupTask_upsert);
});
```

### Using `AdminEnsureMediaDeletionIntent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminEnsureMediaDeletionIntentRef, AdminEnsureMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminEnsureMediaDeletionIntent` mutation requires an argument of type `AdminEnsureMediaDeletionIntentVariables`:
const adminEnsureMediaDeletionIntentVars: AdminEnsureMediaDeletionIntentVariables = {
  taskId: ..., 
  ownerUid: ..., 
  assetId: ..., 
  storyId: ..., // optional
  idempotencyKey: ..., 
  bucket: ..., 
  objectKey: ..., 
  reason: ..., 
};

// Call the `adminEnsureMediaDeletionIntentRef()` function to get a reference to the mutation.
const ref = adminEnsureMediaDeletionIntentRef(adminEnsureMediaDeletionIntentVars);
// Variables can be defined inline as well.
const ref = adminEnsureMediaDeletionIntentRef({ taskId: ..., ownerUid: ..., assetId: ..., storyId: ..., idempotencyKey: ..., bucket: ..., objectKey: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminEnsureMediaDeletionIntentRef(dataConnect, adminEnsureMediaDeletionIntentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaSlot_deleteMany);
console.log(data.mediaAttachment_updateMany);
console.log(data.mediaAsset_update);
console.log(data.mediaDeletionIntent_upsert);
console.log(data.mediaCleanupTask_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaSlot_deleteMany);
  console.log(data.mediaAttachment_updateMany);
  console.log(data.mediaAsset_update);
  console.log(data.mediaDeletionIntent_upsert);
  console.log(data.mediaCleanupTask_upsert);
});
```

## AdminClaimMediaCleanupTask
You can execute the `AdminClaimMediaCleanupTask` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminClaimMediaCleanupTask(vars: AdminClaimMediaCleanupTaskVariables): MutationPromise<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;

interface AdminClaimMediaCleanupTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminClaimMediaCleanupTaskVariables): MutationRef<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;
}
export const adminClaimMediaCleanupTaskRef: AdminClaimMediaCleanupTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminClaimMediaCleanupTask(dc: DataConnect, vars: AdminClaimMediaCleanupTaskVariables): MutationPromise<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;

interface AdminClaimMediaCleanupTaskRef {
  ...
  (dc: DataConnect, vars: AdminClaimMediaCleanupTaskVariables): MutationRef<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;
}
export const adminClaimMediaCleanupTaskRef: AdminClaimMediaCleanupTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminClaimMediaCleanupTaskRef:
```typescript
const name = adminClaimMediaCleanupTaskRef.operationName;
console.log(name);
```

### Variables
The `AdminClaimMediaCleanupTask` mutation requires an argument of type `AdminClaimMediaCleanupTaskVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminClaimMediaCleanupTaskVariables {
  taskId: UUIDString;
  assetId: UUIDString;
  ownerUid: string;
  idempotencyKey: string;
  leaseOwner: string;
  leaseExpiresAt: TimestampString;
}
```
### Return Type
Recall that executing the `AdminClaimMediaCleanupTask` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminClaimMediaCleanupTaskData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminClaimMediaCleanupTaskData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
  mediaDeletionIntent_update?: MediaDeletionIntent_Key | null;
}
```
### Using `AdminClaimMediaCleanupTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminClaimMediaCleanupTask, AdminClaimMediaCleanupTaskVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminClaimMediaCleanupTask` mutation requires an argument of type `AdminClaimMediaCleanupTaskVariables`:
const adminClaimMediaCleanupTaskVars: AdminClaimMediaCleanupTaskVariables = {
  taskId: ..., 
  assetId: ..., 
  ownerUid: ..., 
  idempotencyKey: ..., 
  leaseOwner: ..., 
  leaseExpiresAt: ..., 
};

// Call the `adminClaimMediaCleanupTask()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminClaimMediaCleanupTask(adminClaimMediaCleanupTaskVars);
// Variables can be defined inline as well.
const { data } = await adminClaimMediaCleanupTask({ taskId: ..., assetId: ..., ownerUid: ..., idempotencyKey: ..., leaseOwner: ..., leaseExpiresAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminClaimMediaCleanupTask(dataConnect, adminClaimMediaCleanupTaskVars);

console.log(data.mediaCleanupTask_update);
console.log(data.mediaDeletionIntent_update);

// Or, you can use the `Promise` API.
adminClaimMediaCleanupTask(adminClaimMediaCleanupTaskVars).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
  console.log(data.mediaDeletionIntent_update);
});
```

### Using `AdminClaimMediaCleanupTask`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminClaimMediaCleanupTaskRef, AdminClaimMediaCleanupTaskVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminClaimMediaCleanupTask` mutation requires an argument of type `AdminClaimMediaCleanupTaskVariables`:
const adminClaimMediaCleanupTaskVars: AdminClaimMediaCleanupTaskVariables = {
  taskId: ..., 
  assetId: ..., 
  ownerUid: ..., 
  idempotencyKey: ..., 
  leaseOwner: ..., 
  leaseExpiresAt: ..., 
};

// Call the `adminClaimMediaCleanupTaskRef()` function to get a reference to the mutation.
const ref = adminClaimMediaCleanupTaskRef(adminClaimMediaCleanupTaskVars);
// Variables can be defined inline as well.
const ref = adminClaimMediaCleanupTaskRef({ taskId: ..., assetId: ..., ownerUid: ..., idempotencyKey: ..., leaseOwner: ..., leaseExpiresAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminClaimMediaCleanupTaskRef(dataConnect, adminClaimMediaCleanupTaskVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaCleanupTask_update);
console.log(data.mediaDeletionIntent_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
  console.log(data.mediaDeletionIntent_update);
});
```

## AdminCompleteMediaDeletionIntent
You can execute the `AdminCompleteMediaDeletionIntent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminCompleteMediaDeletionIntent(vars: AdminCompleteMediaDeletionIntentVariables): MutationPromise<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;

interface AdminCompleteMediaDeletionIntentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCompleteMediaDeletionIntentVariables): MutationRef<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;
}
export const adminCompleteMediaDeletionIntentRef: AdminCompleteMediaDeletionIntentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminCompleteMediaDeletionIntent(dc: DataConnect, vars: AdminCompleteMediaDeletionIntentVariables): MutationPromise<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;

interface AdminCompleteMediaDeletionIntentRef {
  ...
  (dc: DataConnect, vars: AdminCompleteMediaDeletionIntentVariables): MutationRef<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;
}
export const adminCompleteMediaDeletionIntentRef: AdminCompleteMediaDeletionIntentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminCompleteMediaDeletionIntentRef:
```typescript
const name = adminCompleteMediaDeletionIntentRef.operationName;
console.log(name);
```

### Variables
The `AdminCompleteMediaDeletionIntent` mutation requires an argument of type `AdminCompleteMediaDeletionIntentVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminCompleteMediaDeletionIntentVariables {
  taskId: UUIDString;
  assetId: UUIDString;
  ownerUid: string;
  idempotencyKey: string;
  leaseOwner: string;
}
```
### Return Type
Recall that executing the `AdminCompleteMediaDeletionIntent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminCompleteMediaDeletionIntentData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminCompleteMediaDeletionIntentData {
  completed?: number | null;
}
```
### Using `AdminCompleteMediaDeletionIntent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminCompleteMediaDeletionIntent, AdminCompleteMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCompleteMediaDeletionIntent` mutation requires an argument of type `AdminCompleteMediaDeletionIntentVariables`:
const adminCompleteMediaDeletionIntentVars: AdminCompleteMediaDeletionIntentVariables = {
  taskId: ..., 
  assetId: ..., 
  ownerUid: ..., 
  idempotencyKey: ..., 
  leaseOwner: ..., 
};

// Call the `adminCompleteMediaDeletionIntent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminCompleteMediaDeletionIntent(adminCompleteMediaDeletionIntentVars);
// Variables can be defined inline as well.
const { data } = await adminCompleteMediaDeletionIntent({ taskId: ..., assetId: ..., ownerUid: ..., idempotencyKey: ..., leaseOwner: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminCompleteMediaDeletionIntent(dataConnect, adminCompleteMediaDeletionIntentVars);

console.log(data.completed);

// Or, you can use the `Promise` API.
adminCompleteMediaDeletionIntent(adminCompleteMediaDeletionIntentVars).then((response) => {
  const data = response.data;
  console.log(data.completed);
});
```

### Using `AdminCompleteMediaDeletionIntent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminCompleteMediaDeletionIntentRef, AdminCompleteMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminCompleteMediaDeletionIntent` mutation requires an argument of type `AdminCompleteMediaDeletionIntentVariables`:
const adminCompleteMediaDeletionIntentVars: AdminCompleteMediaDeletionIntentVariables = {
  taskId: ..., 
  assetId: ..., 
  ownerUid: ..., 
  idempotencyKey: ..., 
  leaseOwner: ..., 
};

// Call the `adminCompleteMediaDeletionIntentRef()` function to get a reference to the mutation.
const ref = adminCompleteMediaDeletionIntentRef(adminCompleteMediaDeletionIntentVars);
// Variables can be defined inline as well.
const ref = adminCompleteMediaDeletionIntentRef({ taskId: ..., assetId: ..., ownerUid: ..., idempotencyKey: ..., leaseOwner: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminCompleteMediaDeletionIntentRef(dataConnect, adminCompleteMediaDeletionIntentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.completed);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.completed);
});
```

## AdminFailMediaDeletionIntent
You can execute the `AdminFailMediaDeletionIntent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminFailMediaDeletionIntent(vars: AdminFailMediaDeletionIntentVariables): MutationPromise<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;

interface AdminFailMediaDeletionIntentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminFailMediaDeletionIntentVariables): MutationRef<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;
}
export const adminFailMediaDeletionIntentRef: AdminFailMediaDeletionIntentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminFailMediaDeletionIntent(dc: DataConnect, vars: AdminFailMediaDeletionIntentVariables): MutationPromise<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;

interface AdminFailMediaDeletionIntentRef {
  ...
  (dc: DataConnect, vars: AdminFailMediaDeletionIntentVariables): MutationRef<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;
}
export const adminFailMediaDeletionIntentRef: AdminFailMediaDeletionIntentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminFailMediaDeletionIntentRef:
```typescript
const name = adminFailMediaDeletionIntentRef.operationName;
console.log(name);
```

### Variables
The `AdminFailMediaDeletionIntent` mutation requires an argument of type `AdminFailMediaDeletionIntentVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminFailMediaDeletionIntentVariables {
  taskId: UUIDString;
  ownerUid: string;
  idempotencyKey: string;
  leaseOwner: string;
  lastError: string;
  nextAttemptAt: TimestampString;
}
```
### Return Type
Recall that executing the `AdminFailMediaDeletionIntent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminFailMediaDeletionIntentData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminFailMediaDeletionIntentData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
  mediaDeletionIntent_update?: MediaDeletionIntent_Key | null;
}
```
### Using `AdminFailMediaDeletionIntent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminFailMediaDeletionIntent, AdminFailMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminFailMediaDeletionIntent` mutation requires an argument of type `AdminFailMediaDeletionIntentVariables`:
const adminFailMediaDeletionIntentVars: AdminFailMediaDeletionIntentVariables = {
  taskId: ..., 
  ownerUid: ..., 
  idempotencyKey: ..., 
  leaseOwner: ..., 
  lastError: ..., 
  nextAttemptAt: ..., 
};

// Call the `adminFailMediaDeletionIntent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminFailMediaDeletionIntent(adminFailMediaDeletionIntentVars);
// Variables can be defined inline as well.
const { data } = await adminFailMediaDeletionIntent({ taskId: ..., ownerUid: ..., idempotencyKey: ..., leaseOwner: ..., lastError: ..., nextAttemptAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminFailMediaDeletionIntent(dataConnect, adminFailMediaDeletionIntentVars);

console.log(data.mediaCleanupTask_update);
console.log(data.mediaDeletionIntent_update);

// Or, you can use the `Promise` API.
adminFailMediaDeletionIntent(adminFailMediaDeletionIntentVars).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
  console.log(data.mediaDeletionIntent_update);
});
```

### Using `AdminFailMediaDeletionIntent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminFailMediaDeletionIntentRef, AdminFailMediaDeletionIntentVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminFailMediaDeletionIntent` mutation requires an argument of type `AdminFailMediaDeletionIntentVariables`:
const adminFailMediaDeletionIntentVars: AdminFailMediaDeletionIntentVariables = {
  taskId: ..., 
  ownerUid: ..., 
  idempotencyKey: ..., 
  leaseOwner: ..., 
  lastError: ..., 
  nextAttemptAt: ..., 
};

// Call the `adminFailMediaDeletionIntentRef()` function to get a reference to the mutation.
const ref = adminFailMediaDeletionIntentRef(adminFailMediaDeletionIntentVars);
// Variables can be defined inline as well.
const ref = adminFailMediaDeletionIntentRef({ taskId: ..., ownerUid: ..., idempotencyKey: ..., leaseOwner: ..., lastError: ..., nextAttemptAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminFailMediaDeletionIntentRef(dataConnect, adminFailMediaDeletionIntentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mediaCleanupTask_update);
console.log(data.mediaDeletionIntent_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mediaCleanupTask_update);
  console.log(data.mediaDeletionIntent_update);
});
```

## AdminDeleteOwnedStorySeed
You can execute the `AdminDeleteOwnedStorySeed` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminDeleteOwnedStorySeed(vars: AdminDeleteOwnedStorySeedVariables): MutationPromise<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;

interface AdminDeleteOwnedStorySeedRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteOwnedStorySeedVariables): MutationRef<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;
}
export const adminDeleteOwnedStorySeedRef: AdminDeleteOwnedStorySeedRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminDeleteOwnedStorySeed(dc: DataConnect, vars: AdminDeleteOwnedStorySeedVariables): MutationPromise<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;

interface AdminDeleteOwnedStorySeedRef {
  ...
  (dc: DataConnect, vars: AdminDeleteOwnedStorySeedVariables): MutationRef<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;
}
export const adminDeleteOwnedStorySeedRef: AdminDeleteOwnedStorySeedRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminDeleteOwnedStorySeedRef:
```typescript
const name = adminDeleteOwnedStorySeedRef.operationName;
console.log(name);
```

### Variables
The `AdminDeleteOwnedStorySeed` mutation requires an argument of type `AdminDeleteOwnedStorySeedVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminDeleteOwnedStorySeedVariables {
  ownerUid: string;
  seedId: UUIDString;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminDeleteOwnedStorySeed` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminDeleteOwnedStorySeedData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminDeleteOwnedStorySeedData {
  story_updateMany: number;
  storySeed_update?: StorySeed_Key | null;
  seedVersionRecorded?: number | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}
```
### Using `AdminDeleteOwnedStorySeed`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminDeleteOwnedStorySeed, AdminDeleteOwnedStorySeedVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteOwnedStorySeed` mutation requires an argument of type `AdminDeleteOwnedStorySeedVariables`:
const adminDeleteOwnedStorySeedVars: AdminDeleteOwnedStorySeedVariables = {
  ownerUid: ..., 
  seedId: ..., 
  idempotencyKey: ..., 
};

// Call the `adminDeleteOwnedStorySeed()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminDeleteOwnedStorySeed(adminDeleteOwnedStorySeedVars);
// Variables can be defined inline as well.
const { data } = await adminDeleteOwnedStorySeed({ ownerUid: ..., seedId: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminDeleteOwnedStorySeed(dataConnect, adminDeleteOwnedStorySeedVars);

console.log(data.story_updateMany);
console.log(data.storySeed_update);
console.log(data.seedVersionRecorded);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
adminDeleteOwnedStorySeed(adminDeleteOwnedStorySeedVars).then((response) => {
  const data = response.data;
  console.log(data.story_updateMany);
  console.log(data.storySeed_update);
  console.log(data.seedVersionRecorded);
  console.log(data.persistenceReceipt_insert);
});
```

### Using `AdminDeleteOwnedStorySeed`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminDeleteOwnedStorySeedRef, AdminDeleteOwnedStorySeedVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteOwnedStorySeed` mutation requires an argument of type `AdminDeleteOwnedStorySeedVariables`:
const adminDeleteOwnedStorySeedVars: AdminDeleteOwnedStorySeedVariables = {
  ownerUid: ..., 
  seedId: ..., 
  idempotencyKey: ..., 
};

// Call the `adminDeleteOwnedStorySeedRef()` function to get a reference to the mutation.
const ref = adminDeleteOwnedStorySeedRef(adminDeleteOwnedStorySeedVars);
// Variables can be defined inline as well.
const ref = adminDeleteOwnedStorySeedRef({ ownerUid: ..., seedId: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminDeleteOwnedStorySeedRef(dataConnect, adminDeleteOwnedStorySeedVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.story_updateMany);
console.log(data.storySeed_update);
console.log(data.seedVersionRecorded);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.story_updateMany);
  console.log(data.storySeed_update);
  console.log(data.seedVersionRecorded);
  console.log(data.persistenceReceipt_insert);
});
```

## AdminDeleteOwnedGlossaryTerm
You can execute the `AdminDeleteOwnedGlossaryTerm` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminDeleteOwnedGlossaryTerm(vars: AdminDeleteOwnedGlossaryTermVariables): MutationPromise<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;

interface AdminDeleteOwnedGlossaryTermRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteOwnedGlossaryTermVariables): MutationRef<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;
}
export const adminDeleteOwnedGlossaryTermRef: AdminDeleteOwnedGlossaryTermRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminDeleteOwnedGlossaryTerm(dc: DataConnect, vars: AdminDeleteOwnedGlossaryTermVariables): MutationPromise<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;

interface AdminDeleteOwnedGlossaryTermRef {
  ...
  (dc: DataConnect, vars: AdminDeleteOwnedGlossaryTermVariables): MutationRef<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;
}
export const adminDeleteOwnedGlossaryTermRef: AdminDeleteOwnedGlossaryTermRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminDeleteOwnedGlossaryTermRef:
```typescript
const name = adminDeleteOwnedGlossaryTermRef.operationName;
console.log(name);
```

### Variables
The `AdminDeleteOwnedGlossaryTerm` mutation requires an argument of type `AdminDeleteOwnedGlossaryTermVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminDeleteOwnedGlossaryTermVariables {
  ownerUid: string;
  termId: UUIDString;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminDeleteOwnedGlossaryTerm` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminDeleteOwnedGlossaryTermData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminDeleteOwnedGlossaryTermData {
  glossaryTerm_delete?: GlossaryTerm_Key | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}
```
### Using `AdminDeleteOwnedGlossaryTerm`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminDeleteOwnedGlossaryTerm, AdminDeleteOwnedGlossaryTermVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteOwnedGlossaryTerm` mutation requires an argument of type `AdminDeleteOwnedGlossaryTermVariables`:
const adminDeleteOwnedGlossaryTermVars: AdminDeleteOwnedGlossaryTermVariables = {
  ownerUid: ..., 
  termId: ..., 
  idempotencyKey: ..., 
};

// Call the `adminDeleteOwnedGlossaryTerm()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminDeleteOwnedGlossaryTerm(adminDeleteOwnedGlossaryTermVars);
// Variables can be defined inline as well.
const { data } = await adminDeleteOwnedGlossaryTerm({ ownerUid: ..., termId: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminDeleteOwnedGlossaryTerm(dataConnect, adminDeleteOwnedGlossaryTermVars);

console.log(data.glossaryTerm_delete);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
adminDeleteOwnedGlossaryTerm(adminDeleteOwnedGlossaryTermVars).then((response) => {
  const data = response.data;
  console.log(data.glossaryTerm_delete);
  console.log(data.persistenceReceipt_insert);
});
```

### Using `AdminDeleteOwnedGlossaryTerm`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminDeleteOwnedGlossaryTermRef, AdminDeleteOwnedGlossaryTermVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteOwnedGlossaryTerm` mutation requires an argument of type `AdminDeleteOwnedGlossaryTermVariables`:
const adminDeleteOwnedGlossaryTermVars: AdminDeleteOwnedGlossaryTermVariables = {
  ownerUid: ..., 
  termId: ..., 
  idempotencyKey: ..., 
};

// Call the `adminDeleteOwnedGlossaryTermRef()` function to get a reference to the mutation.
const ref = adminDeleteOwnedGlossaryTermRef(adminDeleteOwnedGlossaryTermVars);
// Variables can be defined inline as well.
const ref = adminDeleteOwnedGlossaryTermRef({ ownerUid: ..., termId: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminDeleteOwnedGlossaryTermRef(dataConnect, adminDeleteOwnedGlossaryTermVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.glossaryTerm_delete);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.glossaryTerm_delete);
  console.log(data.persistenceReceipt_insert);
});
```

## AdminConsumeImageGenerationQuota
You can execute the `AdminConsumeImageGenerationQuota` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminConsumeImageGenerationQuota(vars: AdminConsumeImageGenerationQuotaVariables): MutationPromise<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;

interface AdminConsumeImageGenerationQuotaRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminConsumeImageGenerationQuotaVariables): MutationRef<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;
}
export const adminConsumeImageGenerationQuotaRef: AdminConsumeImageGenerationQuotaRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminConsumeImageGenerationQuota(dc: DataConnect, vars: AdminConsumeImageGenerationQuotaVariables): MutationPromise<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;

interface AdminConsumeImageGenerationQuotaRef {
  ...
  (dc: DataConnect, vars: AdminConsumeImageGenerationQuotaVariables): MutationRef<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;
}
export const adminConsumeImageGenerationQuotaRef: AdminConsumeImageGenerationQuotaRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminConsumeImageGenerationQuotaRef:
```typescript
const name = adminConsumeImageGenerationQuotaRef.operationName;
console.log(name);
```

### Variables
The `AdminConsumeImageGenerationQuota` mutation requires an argument of type `AdminConsumeImageGenerationQuotaVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminConsumeImageGenerationQuotaVariables {
  ownerUid: string;
  idempotencyKey: string;
  now: TimestampString;
  nextReset: TimestampString;
}
```
### Return Type
Recall that executing the `AdminConsumeImageGenerationQuota` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminConsumeImageGenerationQuotaData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminConsumeImageGenerationQuotaData {
  consumed?: number | null;
}
```
### Using `AdminConsumeImageGenerationQuota`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminConsumeImageGenerationQuota, AdminConsumeImageGenerationQuotaVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminConsumeImageGenerationQuota` mutation requires an argument of type `AdminConsumeImageGenerationQuotaVariables`:
const adminConsumeImageGenerationQuotaVars: AdminConsumeImageGenerationQuotaVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
  now: ..., 
  nextReset: ..., 
};

// Call the `adminConsumeImageGenerationQuota()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminConsumeImageGenerationQuota(adminConsumeImageGenerationQuotaVars);
// Variables can be defined inline as well.
const { data } = await adminConsumeImageGenerationQuota({ ownerUid: ..., idempotencyKey: ..., now: ..., nextReset: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminConsumeImageGenerationQuota(dataConnect, adminConsumeImageGenerationQuotaVars);

console.log(data.consumed);

// Or, you can use the `Promise` API.
adminConsumeImageGenerationQuota(adminConsumeImageGenerationQuotaVars).then((response) => {
  const data = response.data;
  console.log(data.consumed);
});
```

### Using `AdminConsumeImageGenerationQuota`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminConsumeImageGenerationQuotaRef, AdminConsumeImageGenerationQuotaVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminConsumeImageGenerationQuota` mutation requires an argument of type `AdminConsumeImageGenerationQuotaVariables`:
const adminConsumeImageGenerationQuotaVars: AdminConsumeImageGenerationQuotaVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
  now: ..., 
  nextReset: ..., 
};

// Call the `adminConsumeImageGenerationQuotaRef()` function to get a reference to the mutation.
const ref = adminConsumeImageGenerationQuotaRef(adminConsumeImageGenerationQuotaVars);
// Variables can be defined inline as well.
const ref = adminConsumeImageGenerationQuotaRef({ ownerUid: ..., idempotencyKey: ..., now: ..., nextReset: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminConsumeImageGenerationQuotaRef(dataConnect, adminConsumeImageGenerationQuotaVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.consumed);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.consumed);
});
```

## AdminRecoverPendingUserPortraits
You can execute the `AdminRecoverPendingUserPortraits` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminRecoverPendingUserPortraits(vars: AdminRecoverPendingUserPortraitsVariables): MutationPromise<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;

interface AdminRecoverPendingUserPortraitsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminRecoverPendingUserPortraitsVariables): MutationRef<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;
}
export const adminRecoverPendingUserPortraitsRef: AdminRecoverPendingUserPortraitsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminRecoverPendingUserPortraits(dc: DataConnect, vars: AdminRecoverPendingUserPortraitsVariables): MutationPromise<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;

interface AdminRecoverPendingUserPortraitsRef {
  ...
  (dc: DataConnect, vars: AdminRecoverPendingUserPortraitsVariables): MutationRef<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;
}
export const adminRecoverPendingUserPortraitsRef: AdminRecoverPendingUserPortraitsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminRecoverPendingUserPortraitsRef:
```typescript
const name = adminRecoverPendingUserPortraitsRef.operationName;
console.log(name);
```

### Variables
The `AdminRecoverPendingUserPortraits` mutation requires an argument of type `AdminRecoverPendingUserPortraitsVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminRecoverPendingUserPortraitsVariables {
  ownerUid: string;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminRecoverPendingUserPortraits` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminRecoverPendingUserPortraitsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminRecoverPendingUserPortraitsData {
  recovered?: number | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}
```
### Using `AdminRecoverPendingUserPortraits`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminRecoverPendingUserPortraits, AdminRecoverPendingUserPortraitsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminRecoverPendingUserPortraits` mutation requires an argument of type `AdminRecoverPendingUserPortraitsVariables`:
const adminRecoverPendingUserPortraitsVars: AdminRecoverPendingUserPortraitsVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminRecoverPendingUserPortraits()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminRecoverPendingUserPortraits(adminRecoverPendingUserPortraitsVars);
// Variables can be defined inline as well.
const { data } = await adminRecoverPendingUserPortraits({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminRecoverPendingUserPortraits(dataConnect, adminRecoverPendingUserPortraitsVars);

console.log(data.recovered);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
adminRecoverPendingUserPortraits(adminRecoverPendingUserPortraitsVars).then((response) => {
  const data = response.data;
  console.log(data.recovered);
  console.log(data.persistenceReceipt_insert);
});
```

### Using `AdminRecoverPendingUserPortraits`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminRecoverPendingUserPortraitsRef, AdminRecoverPendingUserPortraitsVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminRecoverPendingUserPortraits` mutation requires an argument of type `AdminRecoverPendingUserPortraitsVariables`:
const adminRecoverPendingUserPortraitsVars: AdminRecoverPendingUserPortraitsVariables = {
  ownerUid: ..., 
  idempotencyKey: ..., 
};

// Call the `adminRecoverPendingUserPortraitsRef()` function to get a reference to the mutation.
const ref = adminRecoverPendingUserPortraitsRef(adminRecoverPendingUserPortraitsVars);
// Variables can be defined inline as well.
const ref = adminRecoverPendingUserPortraitsRef({ ownerUid: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminRecoverPendingUserPortraitsRef(dataConnect, adminRecoverPendingUserPortraitsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.recovered);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.recovered);
  console.log(data.persistenceReceipt_insert);
});
```

## AdminUpdateAccountAccess
You can execute the `AdminUpdateAccountAccess` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminUpdateAccountAccess(vars: AdminUpdateAccountAccessVariables): MutationPromise<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;

interface AdminUpdateAccountAccessRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminUpdateAccountAccessVariables): MutationRef<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;
}
export const adminUpdateAccountAccessRef: AdminUpdateAccountAccessRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminUpdateAccountAccess(dc: DataConnect, vars: AdminUpdateAccountAccessVariables): MutationPromise<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;

interface AdminUpdateAccountAccessRef {
  ...
  (dc: DataConnect, vars: AdminUpdateAccountAccessVariables): MutationRef<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;
}
export const adminUpdateAccountAccessRef: AdminUpdateAccountAccessRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminUpdateAccountAccessRef:
```typescript
const name = adminUpdateAccountAccessRef.operationName;
console.log(name);
```

### Variables
The `AdminUpdateAccountAccess` mutation requires an argument of type `AdminUpdateAccountAccessVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminUpdateAccountAccessVariables {
  actorUid: string;
  ownerUid: string;
  role: AccountRole;
  subscriptionTier: SubscriptionTier;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `AdminUpdateAccountAccess` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminUpdateAccountAccessData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminUpdateAccountAccessData {
  userAccount_update?: UserAccount_Key | null;
  userProfile_update?: UserProfile_Key | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}
```
### Using `AdminUpdateAccountAccess`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminUpdateAccountAccess, AdminUpdateAccountAccessVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminUpdateAccountAccess` mutation requires an argument of type `AdminUpdateAccountAccessVariables`:
const adminUpdateAccountAccessVars: AdminUpdateAccountAccessVariables = {
  actorUid: ..., 
  ownerUid: ..., 
  role: ..., 
  subscriptionTier: ..., 
  idempotencyKey: ..., 
};

// Call the `adminUpdateAccountAccess()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminUpdateAccountAccess(adminUpdateAccountAccessVars);
// Variables can be defined inline as well.
const { data } = await adminUpdateAccountAccess({ actorUid: ..., ownerUid: ..., role: ..., subscriptionTier: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminUpdateAccountAccess(dataConnect, adminUpdateAccountAccessVars);

console.log(data.userAccount_update);
console.log(data.userProfile_update);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
adminUpdateAccountAccess(adminUpdateAccountAccessVars).then((response) => {
  const data = response.data;
  console.log(data.userAccount_update);
  console.log(data.userProfile_update);
  console.log(data.persistenceReceipt_insert);
});
```

### Using `AdminUpdateAccountAccess`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminUpdateAccountAccessRef, AdminUpdateAccountAccessVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminUpdateAccountAccess` mutation requires an argument of type `AdminUpdateAccountAccessVariables`:
const adminUpdateAccountAccessVars: AdminUpdateAccountAccessVariables = {
  actorUid: ..., 
  ownerUid: ..., 
  role: ..., 
  subscriptionTier: ..., 
  idempotencyKey: ..., 
};

// Call the `adminUpdateAccountAccessRef()` function to get a reference to the mutation.
const ref = adminUpdateAccountAccessRef(adminUpdateAccountAccessVars);
// Variables can be defined inline as well.
const ref = adminUpdateAccountAccessRef({ actorUid: ..., ownerUid: ..., role: ..., subscriptionTier: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminUpdateAccountAccessRef(dataConnect, adminUpdateAccountAccessVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userAccount_update);
console.log(data.userProfile_update);
console.log(data.persistenceReceipt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userAccount_update);
  console.log(data.userProfile_update);
  console.log(data.persistenceReceipt_insert);
});
```

## AdminDeleteStoryAsAdmin
You can execute the `AdminDeleteStoryAsAdmin` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
adminDeleteStoryAsAdmin(vars: AdminDeleteStoryAsAdminVariables): MutationPromise<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;

interface AdminDeleteStoryAsAdminRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteStoryAsAdminVariables): MutationRef<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;
}
export const adminDeleteStoryAsAdminRef: AdminDeleteStoryAsAdminRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
adminDeleteStoryAsAdmin(dc: DataConnect, vars: AdminDeleteStoryAsAdminVariables): MutationPromise<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;

interface AdminDeleteStoryAsAdminRef {
  ...
  (dc: DataConnect, vars: AdminDeleteStoryAsAdminVariables): MutationRef<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;
}
export const adminDeleteStoryAsAdminRef: AdminDeleteStoryAsAdminRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the adminDeleteStoryAsAdminRef:
```typescript
const name = adminDeleteStoryAsAdminRef.operationName;
console.log(name);
```

### Variables
The `AdminDeleteStoryAsAdmin` mutation requires an argument of type `AdminDeleteStoryAsAdminVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AdminDeleteStoryAsAdminVariables {
  actorUid: string;
  ownerUid: string;
  storyId: UUIDString;
  expectedSyncRevision?: string | null;
  newSyncRevision: string;
  newRevision: Int64String;
  idempotencyKey: string;
  deletionJobId: UUIDString;
}
```
### Return Type
Recall that executing the `AdminDeleteStoryAsAdmin` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AdminDeleteStoryAsAdminData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AdminDeleteStoryAsAdminData {
  storyVersionGuard?: unknown | null;
  story_update?: Story_Key | null;
  storyDeletionJob_insert: StoryDeletionJob_Key;
  storyDeletionStage_insertMany: StoryDeletionStage_Key[];
  persistenceReceipt_insert: PersistenceReceipt_Key;
  storyChange_insert: StoryChange_Key;
}
```
### Using `AdminDeleteStoryAsAdmin`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, adminDeleteStoryAsAdmin, AdminDeleteStoryAsAdminVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteStoryAsAdmin` mutation requires an argument of type `AdminDeleteStoryAsAdminVariables`:
const adminDeleteStoryAsAdminVars: AdminDeleteStoryAsAdminVariables = {
  actorUid: ..., 
  ownerUid: ..., 
  storyId: ..., 
  expectedSyncRevision: ..., // optional
  newSyncRevision: ..., 
  newRevision: ..., 
  idempotencyKey: ..., 
  deletionJobId: ..., 
};

// Call the `adminDeleteStoryAsAdmin()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await adminDeleteStoryAsAdmin(adminDeleteStoryAsAdminVars);
// Variables can be defined inline as well.
const { data } = await adminDeleteStoryAsAdmin({ actorUid: ..., ownerUid: ..., storyId: ..., expectedSyncRevision: ..., newSyncRevision: ..., newRevision: ..., idempotencyKey: ..., deletionJobId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await adminDeleteStoryAsAdmin(dataConnect, adminDeleteStoryAsAdminVars);

console.log(data.storyVersionGuard);
console.log(data.story_update);
console.log(data.storyDeletionJob_insert);
console.log(data.storyDeletionStage_insertMany);
console.log(data.persistenceReceipt_insert);
console.log(data.storyChange_insert);

// Or, you can use the `Promise` API.
adminDeleteStoryAsAdmin(adminDeleteStoryAsAdminVars).then((response) => {
  const data = response.data;
  console.log(data.storyVersionGuard);
  console.log(data.story_update);
  console.log(data.storyDeletionJob_insert);
  console.log(data.storyDeletionStage_insertMany);
  console.log(data.persistenceReceipt_insert);
  console.log(data.storyChange_insert);
});
```

### Using `AdminDeleteStoryAsAdmin`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, adminDeleteStoryAsAdminRef, AdminDeleteStoryAsAdminVariables } from '@seihouse/celestial-library-dataconnect';

// The `AdminDeleteStoryAsAdmin` mutation requires an argument of type `AdminDeleteStoryAsAdminVariables`:
const adminDeleteStoryAsAdminVars: AdminDeleteStoryAsAdminVariables = {
  actorUid: ..., 
  ownerUid: ..., 
  storyId: ..., 
  expectedSyncRevision: ..., // optional
  newSyncRevision: ..., 
  newRevision: ..., 
  idempotencyKey: ..., 
  deletionJobId: ..., 
};

// Call the `adminDeleteStoryAsAdminRef()` function to get a reference to the mutation.
const ref = adminDeleteStoryAsAdminRef(adminDeleteStoryAsAdminVars);
// Variables can be defined inline as well.
const ref = adminDeleteStoryAsAdminRef({ actorUid: ..., ownerUid: ..., storyId: ..., expectedSyncRevision: ..., newSyncRevision: ..., newRevision: ..., idempotencyKey: ..., deletionJobId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = adminDeleteStoryAsAdminRef(dataConnect, adminDeleteStoryAsAdminVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storyVersionGuard);
console.log(data.story_update);
console.log(data.storyDeletionJob_insert);
console.log(data.storyDeletionStage_insertMany);
console.log(data.persistenceReceipt_insert);
console.log(data.storyChange_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storyVersionGuard);
  console.log(data.story_update);
  console.log(data.storyDeletionJob_insert);
  console.log(data.storyDeletionStage_insertMany);
  console.log(data.persistenceReceipt_insert);
  console.log(data.storyChange_insert);
});
```

