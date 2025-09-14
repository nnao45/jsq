import { describe, expect, it } from 'vitest';
import { _ } from './lodash-non-vm';

describe('lodash mergeWith', () => {
  it('should deeply merge objects with custom merge function', () => {
    const object = {
      a: [1, 2],
      b: { x: 1, y: 2 },
    };
    const source = {
      a: [3, 4],
      b: { y: 3, z: 4 },
    };

    const customizer = (objValue: unknown, srcValue: unknown) => {
      if (Array.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    };

    const result = _.mergeWith(object, source, customizer);

    expect(result).toEqual({
      a: [1, 2, 3, 4],
      b: { x: 1, y: 3, z: 4 },
    });
  });

  it('should handle multiple sources', () => {
    const object = { a: 1 };
    const source1 = { b: 2 };
    const source2 = { c: 3 };

    const result = _.mergeWith(object, source1, source2);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should return undefined if customizer returns undefined', () => {
    const object = { a: 1, b: 2 };
    const source = { a: 3, b: 4 };

    const customizer = () => undefined;

    const result = _.mergeWith(object, source, customizer);

    expect(result).toEqual({ a: 3, b: 4 });
  });

  it('should work with chain syntax', () => {
    const object = {
      a: [1, 2],
      b: { x: 1 },
    };
    const source = {
      a: [3, 4],
      b: { y: 2 },
    };

    const customizer = (objValue: unknown, srcValue: unknown) => {
      if (Array.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    };

    const result = _(object).mergeWith(source, customizer).value();

    expect(result).toEqual({
      a: [1, 2, 3, 4],
      b: { x: 1, y: 2 },
    });
  });

  it('should auto-unwrap SmartDollar/ChainableWrapper instances', () => {
    const object = { a: 1 };
    const wrappedSource = {
      __isSmartDollar: true,
      valueOf: () => ({ b: 2 }),
    };

    const result = _.mergeWith(object, wrappedSource);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should deeply merge nested objects', () => {
    const object = {
      a: {
        b: {
          c: 1,
          d: 2,
        },
      },
    };
    const source = {
      a: {
        b: {
          d: 3,
          e: 4,
        },
      },
    };

    const result = _.mergeWith(object, source);

    expect(result).toEqual({
      a: {
        b: {
          c: 1,
          d: 3,
          e: 4,
        },
      },
    });
  });

  it('should handle null and undefined values', () => {
    const object = { a: null, b: undefined, c: 1 };
    const source = { a: 1, b: 2, c: null };

    const result = _.mergeWith(object, source);

    expect(result).toEqual({ a: 1, b: 2, c: null });
  });

  it('should preserve array indexes with custom function', () => {
    const object = { a: [1, undefined, 3] };
    const source = { a: [undefined, 2, undefined, 4] };

    const customizer = (objValue: unknown, srcValue: unknown) => {
      if (Array.isArray(objValue) && Array.isArray(srcValue)) {
        const result = [...objValue];
        srcValue.forEach((val, index) => {
          if (val !== undefined) {
            result[index] = val;
          }
        });
        return result;
      }
    };

    const result = _.mergeWith(object, source, customizer);

    expect(result).toEqual({ a: [1, 2, 3, 4] });
  });
});
