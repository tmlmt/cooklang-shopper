// pinia >= 4.0.0 ships `dist/pinia.js` with bare references to the Vue
// compile-time feature flag `__VUE_PROD_DEVTOOLS__` (the `typeof` guard it used
// to carry was lost in the 4.0.0 rewrite). Nitro externalises pinia into
// .output/server/node_modules, so no bundler ever replaces the flag, and in a
// production build `createPinia()` throws a ReferenceError on every SSR render.
// Defining the global here makes the flag resolvable at runtime.
// Remove once pinia restores the guard upstream.
declare global {
  var __VUE_PROD_DEVTOOLS__: boolean | undefined;
}

export default defineNitroPlugin(() => {
  globalThis.__VUE_PROD_DEVTOOLS__ = false;
});
