type CapacitorPlugin = Record<PropertyKey, unknown>;

type CapacitorGlobal = {
  Plugins?: Record<string, CapacitorPlugin>;
};

/**
 * Browser build shim for @capacitor/core's registerPlugin.
 *
 * The public web app never invokes native-only plugins because the platform
 * guards return false. Returning a lazy proxy keeps module initialization safe
 * while still delegating to a native plugin if a Capacitor bridge is present.
 */
export function registerPlugin<T extends object>(pluginName: string): T {
  return new Proxy({} as T, {
    get(_target, property) {
      return (...args: unknown[]) => {
        const capacitor = (globalThis as typeof globalThis & { Capacitor?: CapacitorGlobal }).Capacitor;
        const plugin = capacitor?.Plugins?.[pluginName];
        const method = plugin?.[property];

        if (typeof method !== 'function') {
          return Promise.reject(new Error(`${pluginName}.${String(property)} is unavailable on the web platform.`));
        }

        return method.apply(plugin, args);
      };
    },
  });
}
