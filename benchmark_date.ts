import { performance } from 'perf_hooks';

function runDateBenchmark(iterations: number) {
  const dates = Array.from({ length: 100 }, () => new Date(Date.now() - Math.random() * 1000000000).toISOString());

  // toLocaleDateString Benchmark
  const startLocale = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const dateStr of dates) {
      new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }
  const endLocale = performance.now();
  const timeLocale = endLocale - startLocale;

  // Intl.DateTimeFormat Benchmark
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const startIntl = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const dateStr of dates) {
      formatter.format(new Date(dateStr));
    }
  }
  const endIntl = performance.now();
  const timeIntl = endIntl - startIntl;

  console.log(`Iterations: ${iterations} x 100 dates`);
  console.log(`  toLocaleDateString: ${timeLocale.toFixed(4)} ms`);
  console.log(`  Intl.DateTimeFormat: ${timeIntl.toFixed(4)} ms`);
  console.log(`  Improvement: ${(timeLocale / timeIntl).toFixed(2)}x faster`);
  console.log('---');
}

console.log('Starting Date Formatting Benchmark...');
runDateBenchmark(100);
runDateBenchmark(1000);
