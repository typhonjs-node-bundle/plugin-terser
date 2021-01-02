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
class PluginHandler
{
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
      ev.eventbus.on('typhonjs:oclif:bundle:plugins:main:output:get', PluginHandler.getOutputPlugin, PluginHandler);
      ev.eventbus.on('typhonjs:oclif:bundle:plugins:npm:input:get', PluginHandler.getOutputPlugin, PluginHandler);
   }
}

/**
 * Oclif init hook to add PluginHandler to plugin manager.
 *
 * @param {object} opts - options of the CLI action.
 *
 * @returns {Promise<void>}
 */
module.exports = async function(opts)
{
   try
   {
      global.$$pluginManager.add({ name: '@typhonjs-node-bundle/plugin-terser', instance: PluginHandler });

      // Adds flags for various built in commands like `build`.
      s_ADD_FLAGS(opts.id);

      // TODO REMOVE
      process.stdout.write(`plugin-terser init hook running ${opts.id}\n`);
   }
   catch (error)
   {
      this.error(error);
   }
};

/**
 * Adds flags for various built in commands like `build`.
 *
 * @param {string} command - ID of the command being run.
 */
function s_ADD_FLAGS(command)
{
   switch (command)
   {
      // Add all built in flags for the build command.
      case 'bundle':
         global.$$eventbus.trigger('typhonjs:oclif:system:flaghandler:add', {
            command,
            plugin: 'plugin-terser',
            flags: {
               // By default compress is set to true, but if the environment variable `DEPLOY_COMPRESS` is defined as
               // 'true' or 'false' that will determine the setting for compress.
               compress: flags.boolean({
                  'description': '[default: true] Compress output using Terser.',
                  'allowNo': true,
                  'default': function()
                  {
                     if (process.env.DEPLOY_COMPRESS === 'true') { return true; }

                     return process.env.DEPLOY_COMPRESS !== 'false';
                  }
               })
            }
         });
         break;
   }
}