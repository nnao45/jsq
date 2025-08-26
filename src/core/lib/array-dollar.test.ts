import { describe, expect, it } from '@jest/globals';
import { createSmartDollar } from './jquery-wrapper';

describe('Array input with $ handling', () => {
  it('should return array itself when $ is used alone', () => {
    const data = [1, 2, 3, 4, 5];
    const $ = createSmartDollar(data);

    // $ should be the array itself
    expect($).toEqual([1, 2, 3, 4, 5]);
    expect(Array.isArray($)).toBe(true);
    expect($.length).toBe(5);
  });

  it('should support array methods on $', () => {
    const data = [1, 2, 3, 4, 5];
    const $ = createSmartDollar(data) as unknown[] & Record<string, unknown>;

    // Native array methods
    expect($[0]).toBe(1);
    expect($.slice(0, 2)).toEqual([1, 2]);

    // Custom chainable methods
    const chunkResult = $.chunk(2) as { value: unknown };
    expect(chunkResult.value).toEqual([[1, 2], [3, 4], [5]]);

    const filterResult = $.filter((x: number) => x > 3) as { value: unknown };
    expect(filterResult.value).toEqual([4, 5]);

    const mapResult = $.map((x: number) => x * 2) as { value: unknown };
    expect(mapResult.value).toEqual([2, 4, 6, 8, 10]);
  });

  it('should work correctly in expression evaluation context', () => {
    const data = [1, 2, 3, 4, 5];
    const $ = createSmartDollar(data);

    // When $ is used directly, it should be the array
    expect($).toEqual([1, 2, 3, 4, 5]);

    // Test with Function constructor instead of eval
    const fn = new Function('$', 'return $');
    const result = fn($);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('should stringify correctly as JSON', () => {
    const data = [1, 2, 3, 4, 5];
    const $ = createSmartDollar(data);

    expect(JSON.stringify($)).toBe('[1,2,3,4,5]');
  });
});
