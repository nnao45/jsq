import { createWriteStream } from 'fs';

const stream = createWriteStream('benchmark.jsonl');

for (let i = 1; i <= 10000; i++) {
  stream.write(JSON.stringify({
    id: i,
    value: "test data",
    nested: {
      foo: "bar",
      array: [1, 2, 3]
    }
  }) + '\n');
}

stream.end();
console.log('Created benchmark.jsonl with 10000 lines');