import * as NodeCache from 'node-cache';
import { hasher } from 'node-object-hash';
import { get } from 'lodash';

const hashSortCoerce = hasher({ sort: true, coerce: true });

type KeyGetter = Parameters<typeof get>[1] | ((...args: any[]) => string);

/**
 * @deprecated this is probably one of the worst ways to implement a cache, but still acceptable due to our limited resources and current backend overload
 * Use this method with caution
 */
export const Cacheable = (
  /**
   * Path to the key in the arguments array, or a function that returns the key
   */
  keyGetter: KeyGetter,
  /**
   * TTL in seconds, or NodeCache options object
   */
  ttlOrOptions: number | NodeCache.Options,
): MethodDecorator => {
  const cache = new NodeCache(
    typeof ttlOrOptions === 'number' ? { stdTTL: ttlOrOptions } : ttlOrOptions,
  );

  return <T extends object>(target, propertyKey, descriptor) => {
    const original = descriptor.value;

    const getKey =
      typeof keyGetter === 'function'
        ? keyGetter
        : (...args) => get(args, keyGetter);

    descriptor.value = new Proxy(original, {
      apply: (target, thisArg, args) => {
        const providedKey = getKey(...args);

        const safeKey =
          typeof providedKey === 'string'
            ? providedKey
            : hashSortCoerce.hash(providedKey);

        if (cache.has(safeKey)) {
          return cache.get(safeKey);
        }

        const result = target.apply(thisArg, args);

        const updateCache = (value) => {
          cache.set(safeKey, value);
          return value;
        };

        if (result instanceof Promise) {
          return result.then(updateCache);
        }

        return updateCache(result);
      },
    });

    // Copy all metadata from original descriptor.value to ensure the proper functioning of other decorators (like @Get, @Post, etc)
    Reflect.getMetadataKeys(original).forEach((key) => {
      const metadata = Reflect.getMetadata(key, original);
      Reflect.defineMetadata(key, metadata, descriptor.value);
    });

    return descriptor;
  };
};
