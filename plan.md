# Karma Nodes Metrics Optimization Plan

1. **Identify Performance Bottleneck**: The file `src/components/codex/LivingCodexDashboards.tsx` uses multiple `.filter(n => ...)` methods along with `.length` and `.reduce` internally (by iterating on arrays) inside a render loop to calculate Causal Web Metrics (Active Karma Contracts, Karmic Debts, Celestial Boons, Destinies & Enmities). This iterates over the `activeStory.karmaNodes` array multiple times, which is inefficient and creates O(N) operations inside a functional component that may be re-rendered often.

2. **Implement Optimization**: Replace the multiple `.filter` iterations with a single `for` loop pass over `activeStory.karmaNodes`. We'll initialize variables for the counts and array, and iterate exactly once. This preserves O(N) asymptotic complexity while reducing six traversals of `activeStory.karmaNodes` to one and eliminating intermediate filter-array allocations.
    - `src/components/codex/LivingCodexDashboards.tsx`: Lines 386-392

    ```javascript
    const activeNodes = [];
    const resolvedNodes = [];
    let debts = 0;
    let boons = 0;
    let enmities = 0;
    let destinies = 0;

    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.status === 'active') activeNodes.push(n);
        else if (n.status === 'resolved') resolvedNodes.push(n);

        if (n.type === 'Debt') debts++;
        else if (n.type === 'Boon') boons++;
        else if (n.type === 'Enmity') enmities++;
        else if (n.type === 'Destiny') destinies++;
    }
    ```

3. **Measure Impact**: Add a comment indicating this optimization preserves O(N) asymptotic complexity while reducing six traversals of `activeStory.karmaNodes` to one and eliminating intermediate filter-array allocations.

4. **Complete pre-commit steps**: Run linting, types check, and testing before committing.

5. **Submit PR**: Commit using the title format `⚡ Bolt: [performance improvement]`.
