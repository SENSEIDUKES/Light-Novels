# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertMyAccount, createFoundationProbe, deleteMyFoundationProbe, createStoryWithFirstChapter, createMyChapter, softDeleteMyStory, adminPurgeFoundationProbe, adminPurgeFoundationStory, adminReserveMediaAsset, adminCommitMediaAssetReady } from '@seihouse/celestial-library-dataconnect';


// Operation UpsertMyAccount: 
const { data } = await UpsertMyAccount(dataConnect);

// Operation CreateFoundationProbe:  For variables, look at type CreateFoundationProbeVars in ../index.d.ts
const { data } = await CreateFoundationProbe(dataConnect, createFoundationProbeVars);

// Operation DeleteMyFoundationProbe:  For variables, look at type DeleteMyFoundationProbeVars in ../index.d.ts
const { data } = await DeleteMyFoundationProbe(dataConnect, deleteMyFoundationProbeVars);

// Operation CreateStoryWithFirstChapter:  For variables, look at type CreateStoryWithFirstChapterVars in ../index.d.ts
const { data } = await CreateStoryWithFirstChapter(dataConnect, createStoryWithFirstChapterVars);

// Operation CreateMyChapter:  For variables, look at type CreateMyChapterVars in ../index.d.ts
const { data } = await CreateMyChapter(dataConnect, createMyChapterVars);

// Operation SoftDeleteMyStory:  For variables, look at type SoftDeleteMyStoryVars in ../index.d.ts
const { data } = await SoftDeleteMyStory(dataConnect, softDeleteMyStoryVars);

// Operation AdminPurgeFoundationProbe:  For variables, look at type AdminPurgeFoundationProbeVars in ../index.d.ts
const { data } = await AdminPurgeFoundationProbe(dataConnect, adminPurgeFoundationProbeVars);

// Operation AdminPurgeFoundationStory:  For variables, look at type AdminPurgeFoundationStoryVars in ../index.d.ts
const { data } = await AdminPurgeFoundationStory(dataConnect, adminPurgeFoundationStoryVars);

// Operation AdminReserveMediaAsset:  For variables, look at type AdminReserveMediaAssetVars in ../index.d.ts
const { data } = await AdminReserveMediaAsset(dataConnect, adminReserveMediaAssetVars);

// Operation AdminCommitMediaAssetReady:  For variables, look at type AdminCommitMediaAssetReadyVars in ../index.d.ts
const { data } = await AdminCommitMediaAssetReady(dataConnect, adminCommitMediaAssetReadyVars);


```