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
    status: MediaCleanupStatus;
    attemptCount: number;
    lastError?: string | null;
    nextAttemptAt: TimestampString;
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

