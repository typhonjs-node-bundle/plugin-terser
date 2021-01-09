const { terser }     = require('rollup-plugin-terser');
const { flags }      = require('@oclif/command');

const s_CONFLICT_PACKAGES = ['rollup-plugin-terser'];
const s_PACKAGE_NAME = '@typhonjs-node-rollup/plugin-terser';

const s_DEFAULT_CONFIG = {
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

/**
 * Handles interfacing with the plugin manager adding event bindings to pass back a configured
 * instance of `rollup-plugin-terser`.
 */
class PluginLoader
{
   /**
    * Returns the any modules that cause a conflict.
    *
    * @returns {string[]}
    */
   static get conflictPackages() { return s_CONFLICT_PACKAGES; }

   /**
    * Returns the `package.json` module name.
    *
    * @returns {string}
    */
   static get packageName() { return s_PACKAGE_NAME; }

   /**
    * Adds flags for various built in commands like `bundle`.
    *
    * Added flags include:
    * `--compress`  - Indicates that the output should be compressed.  - default: true - env: {prefix}_COMPRESS'
    *
    * @param {string} command - ID of the command being run.
    * @param {object} eventbus - The eventbus to add flags to.
    */
   static addFlags(command, eventbus)
   {
      eventbus.trigger('typhonjs:oclif:system:flaghandler:add', {
         command: 'bundle',
         pluginName: PluginLoader.packageName,
         flags: {
            // By default compress is set to true, but if the environment variable `{prefix}_COMPRESS` is defined
            // as 'true' or 'false' that will determine the setting for compress.
            compress: flags.boolean({
               'description': '[default: true] Compress output using Terser.',
               'allowNo': true,
               'default': function()
               {
                  const envVar = `${global.$$flag_env_prefix}_COMPRESS`;

                  if (process.env[envVar] === 'true') { return true; }

                  return process.env[envVar] !== 'false';
               }
            })
         }
      });
   }

   /**
    * Returns the configured input plugin for `rollup-plugin-terser`
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
         const config = await PluginLoader._loadConfig(bundleData.cliFlags);

         if (config !== null)
         {
            return terser(config);
         }
      }
   }

   /**
    * Attempt to load a local configuration file or provide the default configuration.
    *
    * @param {object} cliFlags - The CLI flags.
    *
    * @returns {object} Either the default Terser configuration file or a locally provided configuration file.
    * @private
    */
   static async _loadConfig(cliFlags)
   {
      if (typeof cliFlags['ignore-local-config'] === 'boolean' && cliFlags['ignore-local-config'])
      {
         return s_DEFAULT_CONFIG;
      }

      const result = await global.$$eventbus.triggerAsync('typhonjs:oclif:system:file:util:config:open', {
         moduleName: 'terser',
         errorMessage: `${PluginLoader.packageName} loading local configuration file failed...`
      });

      if (result !== null)
      {
         if (typeof result.config === 'object')
         {
            if (Object.keys(result.config).length === 0)
            {
               global.$$eventbus.trigger('log:warn', `${PluginLoader.packageName}: local Terser configuration file `
              + `empty using default config:\n${result.relativePath}`);

               return s_DEFAULT_CONFIG;
            }

            global.$$eventbus.trigger('log:verbose',
             `${PluginLoader.packageName}: deferring to local Terser configuration file.`);

            return result.config;
         }
         else
         {
            global.$$eventbus.trigger('log:warn', `${PluginLoader.packageName}: local Terser configuration file `
           + `malformed using default config; expected an 'object':\n${result.relativePath}`);

            return s_DEFAULT_CONFIG;
         }
      }

      return s_DEFAULT_CONFIG;
   }

   /**
    * Wires up PluginHandler on the plugin eventbus.
    *
    * @param {PluginEvent} ev - The plugin event.
    *
    * @see https://www.npmjs.com/package/typhonjs-plugin-manager
    *
    * @ignore
    */
   static onPluginLoad(ev)
   {
      ev.eventbus.on('typhonjs:oclif:bundle:plugins:main:output:get', PluginLoader.getOutputPlugin, PluginLoader);
      ev.eventbus.on('typhonjs:oclif:bundle:plugins:npm:output:get', PluginLoader.getOutputPlugin, PluginLoader);

      PluginLoader.addFlags(ev.pluginOptions.id, ev.eventbus);
   }
}

module.exports = PluginLoader;
