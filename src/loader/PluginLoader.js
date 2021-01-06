const { terser }  = require('rollup-plugin-terser');

const { flags }   = require('@oclif/command');

const s_TEST_CONFIG = {
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
    * Returns the `package.json` module name.
    *
    * @returns {string}
    */
   static get pluginName() { return '@typhonjs-node-rollup/plugin-terser'; }

   /**
    * Returns the rollup plugins managed.
    *
    * @returns {string[]}
    */
   static get rollupPlugins() { return ['rollup-plugin-terser']; }

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
      switch (command)
      {
         // Add all built in flags for the build command.
         case 'bundle':
            eventbus.trigger('typhonjs:oclif:system:flaghandler:add', {
               command,
               plugin: 'plugin-terser',
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
            break;
      }
   }

   /**
    * Returns the configured input plugin for `rollup-plugin-terser`
    *
    * @param {object} bundleData - The CLI config
    * @param {object} bundleData.cliFlags - The CLI flags
    *
    * @returns {object} Rollup plugin
    */
   static getOutputPlugin(bundleData = {})
   {
      if (bundleData.cliFlags && bundleData.cliFlags.compress === true)
      {
         return terser(s_TEST_CONFIG);
      }
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
