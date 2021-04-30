import { terser } from 'rollup-plugin-terser';

const s_CONFLICT_PACKAGES = ['rollup-plugin-terser'];
const s_PACKAGE_NAME = '@typhonjs-oclif-rollup/plugin-terser';

const s_DEFAULT_CONFIG = () =>
{
   return {
      compress: {
         booleans_as_integers: true,
         passes: 3
      },

      mangle: {
         toplevel: true
      },

      ecma: 2020,

      module: true
   };
};

/**
 * Handles interfacing with the plugin manager adding event bindings to pass back a configured
 * instance of `rollup-plugin-terser`.
 */
export default class PluginLoader
{
   /**
    * Returns the any modules that cause a conflict.
    *
    * @returns {string[]} An array of conflicting packages.
    */
   static get conflictPackages() { return s_CONFLICT_PACKAGES; }

   /**
    * Returns the `package.json` module name.
    *
    * @returns {string} Package name.
    */
   static get packageName() { return s_PACKAGE_NAME; }

   /**
    * Adds flags for various built in commands like `bundle`.
    *
    * Added flags include:
    * `--compress`  - Indicates that the output should be compressed.  - default: true - env: {prefix}_COMPRESS'
    *
    * @param {object} eventbus - The eventbus to add flags to.
    *
    * @param {object} flags - The Oclif flags generator.
    */
   static addFlags(eventbus, flags)
   {
      eventbus.trigger('typhonjs:oclif:system:handler:flag:add', {
         command: 'bundle',
         pluginName: PluginLoader.packageName,
         flags: {
            // By default compress is set to true, but if the environment variable `{prefix}_COMPRESS` is defined
            // as 'true' or 'false' that will determine the setting for compress.
            compress: flags.boolean({
               'description': '[default: true] Compress output using Terser.',
               'allowNo': true,
               'default': function(context)
               {
                  const envVars = context === null ? {} : process.env;
                  const envVar = `${globalThis.$$cli_env_prefix}_COMPRESS`;

                  let defaultValue = true;

                  if (envVar in envVars && envVars[envVar] !== 'true')
                  {
                     defaultValue = false;
                  }

                  return defaultValue;
               }
            })
         }
      });
   }

   /**
    * Returns the configured input plugin for `rollup-plugin-terser`.
    *
    * @param {object} bundleData - The CLI config
    * @param {object} bundleData.cliFlags - The CLI flags
    *
    * @returns {object} Rollup plugin
    */
   static async getOutputPlugin(bundleData = {})
   {
      if (bundleData.cliFlags && bundleData.cliFlags.compress === true)
      {
         let config;

         // Handle ignoring loading local config files if the CLI flag `--ignore-local-config` is true.
         if (typeof bundleData.cliFlags['ignore-local-config'] === 'boolean' &&
            bundleData.cliFlags['ignore-local-config'])
         {
            config = s_DEFAULT_CONFIG();
         }
         else
         {
            config = await globalThis.$$eventbus.triggerAsync('typhonjs:utils:cosmiconfig:config:load:safe', {
               moduleName: 'terser',
               packageName: PluginLoader.packageName,
               defaultConfig: s_DEFAULT_CONFIG(),
               startDir: globalThis.$$cli_baseCWD,
               stopDir: globalThis.$$cli_origCWD
            });
         }

         return terser(config);
      }
   }

   /**
    * Wires up PluginLoader on the plugin eventbus.
    *
    * @param {object} ev - PluginInvokeEvent - The plugin event.
    *
    * @see https://www.npmjs.com/package/@typhonjs-plugin/manager
    *
    * @ignore
    */
   static async onPluginLoad(ev)
   {
      ev.eventbus.on('typhonjs:oclif:bundle:plugins:main:output:get', PluginLoader.getOutputPlugin, PluginLoader);
      ev.eventbus.on('typhonjs:oclif:bundle:plugins:npm:output:get', PluginLoader.getOutputPlugin, PluginLoader);

      const flags = await import(ev.pluginOptions.flagsModule);

      PluginLoader.addFlags(ev.eventbus, flags);
   }
}
