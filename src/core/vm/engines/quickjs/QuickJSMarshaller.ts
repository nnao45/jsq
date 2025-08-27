import type { SerializedValue, ValueMarshaller } from '../../interfaces/VMEngine';

export class QuickJSMarshaller implements ValueMarshaller {
  serialize(value: unknown): SerializedValue {
    if (value === null) {
      return { type: 'null', value: null };
    }

    if (value === undefined) {
      return { type: 'undefined', value: undefined };
    }

    if (typeof value === 'function') {
      return {
        type: 'function',
        value: value.toString(),
        metadata: { name: value.name },
      };
    }

    if (Array.isArray(value)) {
      return { type: 'array', value };
    }

    if (typeof value === 'object') {
      return { type: 'object', value };
    }

    // Primitive types
    return { type: 'primitive', value };
  }

  deserialize(serialized: SerializedValue): unknown {
    const { type, value } = serialized;

    switch (type) {
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      case 'primitive':
      case 'object':
      case 'array':
        return value;
      case 'function':
        // Functions cannot be properly deserialized
        return `[Function: ${serialized.metadata?.name || 'anonymous'}]`;
      default:
        throw new Error(`Cannot deserialize type: ${type}`);
    }
  }
}
