export const asyncMethods = {
  mapAsync: async <T, U>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<U>
  ): Promise<U[]> => Promise.all(array.map((item, index) => fn(item, index, array))),

  mapAsyncSeq: async <T, U>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<U>
  ): Promise<U[]> => {
    const results: U[] = [];
    for (let i = 0; i < array.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: array access is safe within bounds
      results.push(await fn(array[i]!, i, array));
    }
    return results;
  },

  forEachAsync: async <T>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<void>
  ): Promise<void> => {
    await Promise.all(array.map((item, index) => fn(item, index, array)));
  },

  forEachAsyncSeq: async <T>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<void>
  ): Promise<void> => {
    for (let i = 0; i < array.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: array access is safe within bounds
      await fn(array[i]!, i, array);
    }
  },
};
