const { flags }   = require('@oclif/command');

/**
 * Handles interfacing with the plugin manager adding event bindings to pass back a configured
 * instance of `rollup-plugin-terser`.
 */
class PluginHandler
{
   /**
    * @returns {string}
    */
   static test() { return 'some testing'; }

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
      const eventbus = ev.eventbus;

      let eventPrepend = '';

      const options = ev.pluginOptions;

      // Apply any plugin options.
      if (typeof options === 'object')
      {
         // If `eventPrepend` is defined then it is prepended before all event bindings.
         if (typeof options.eventPrepend === 'string') { eventPrepend = `${options.eventPrepend}:`; }
      }

      // TODO: ADD EVENT REGISTRATION
      // eventbus.on(`${eventPrepend}test`, PluginHandler.test, PluginHandler);
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
   process.pluginManager.add({ name: 'plugin-terser', instance: PluginHandler });

   // Adds flags for various built in commands like `build`.
   s_ADD_FLAGS(opts.id);

   // TODO REMOVE
   process.stdout.write(`plugin-terser init hook running ${opts.id}\n`);
};

/**
 * Adds flags for various built in commands like `build`.
 *
 * @param {string} commandID - ID of the command being run.
 */
function s_ADD_FLAGS(commandID)
{
   switch (commandID)
   {
      // Add all built in flags for the build command.
      case 'build':
         process.eventbus.trigger('oclif:flaghandler:add', {
            // By default compress is set to true, but if the environment variable `DEPLOY_COMPRESS` is defined as
            // 'true' or 'false' that will determine the setting for compress.
            compress: flags.boolean({
               'description': 'Compress output using Terser.', 'default': function()
               {
                  if (process.env.DEPLOY_COMPRESS === 'true') { return true; }

                  return process.env.DEPLOY_COMPRESS !== 'false';
               }
            }),
         });
         break;
   }
}