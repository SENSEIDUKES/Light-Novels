import { performance } from 'perf_hooks';

interface Item {
  id: string;
  name: string;
}

function runBenchmark(size: number, iterations: number) {
  const items: Item[] = Array.from({ length: size }, (_, i) => ({
    id: `id-${i}`,
    name: `Item ${i}`
  }));

  const map = new Map<string, Item>();
  items.forEach(item => map.set(item.id, item));

  const targetIds = Array.from({ length: iterations }, () =>
    `id-${Math.floor(Math.random() * size)}`
  );

  // Array.find Benchmark
  const startFind = performance.now();
  for (const id of targetIds) {
    items.find(item => item.id === id);
  }
  const endFind = performance.now();
  const timeFind = endFind - startFind;

  // Map.get Benchmark
  const startMap = performance.now();
  for (const id of targetIds) {
    map.get(id);
  }
  const endMap = performance.now();
  const timeMap = endMap - startMap;

  console.log(`Size: ${size}, Iterations: ${iterations}`);
  console.log(`  Array.find: ${timeFind.toFixed(4)} ms`);
  console.log(`  Map.get:    ${timeMap.toFixed(4)} ms`);
  console.log(`  Improvement: ${(timeFind / timeMap).toFixed(2)}x faster`);
  console.log('---');
}

console.log('Starting Lookup Benchmark...');
runBenchmark(10, 100000);
runBenchmark(100, 100000);
runBenchmark(1000, 10000);
runBenchmark(5000, 10000);
