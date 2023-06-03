import * as NodeCache from 'node-cache';
import * as objectHash from 'object-hash';
import { get } from 'lodash';

type KeyGetter =
  | Parameters<typeof get>[1]
  | ((...arguments_: any[]) => string | Parameters<typeof objectHash.sha1>[0])

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
   * TTL in seconds, or a function that returns the TTL in seconds
   */
  ttlOrGetter: number | (<T>(result: T) => number),
  /**
   * Optional NodeCache options object
   */
  options: NodeCache.Options = {},
): MethodDecorator => {
  const cache = new NodeCache(options);

  const ttlGetter =
    typeof ttlOrGetter === 'function' ? ttlOrGetter : () => ttlOrGetter;

  return <T extends object>(target, propertyKey, descriptor) => {
    const contextName = `${target.constructor.name}.${String(propertyKey)}`;
    const original = descriptor.value;

    const getKey =
      typeof keyGetter === 'function'
        ? keyGetter
        : (...arguments_) => get(arguments_, keyGetter);

    descriptor.value = new Proxy(original, {
      apply: (target, thisArg, args) => {
        const providedKey = getKey(...args);

        const callOriginal = () => target.apply(thisArg, args);

        let safeKey;

        try {
          safeKey =
            typeof providedKey === 'string'
              ? providedKey
              : objectHash(providedKey, {
                  ignoreUnknown: true,
                  respectType: false,
                });

          if (safeKey === undefined) {
            console.warn(
              `@Cacheable at ${contextName} receved undefined key, which is probably a mistake. Falling back to original method for safety reasons.`,
            );
            return callOriginal();
          }
        } catch (error: unknown) {
          console.warn(
            `@Cacheable at ${contextName} failed. Falling back to original method:`,
            error,
          );
          return callOriginal();
        }

        if (cache.has(safeKey)) {
          return cache.get(safeKey);
        }

        const result = callOriginal();

        const updateCache = (value) => {
          cache.set(safeKey, value, ttlGetter(value));
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
