require('./lib/globals')

module.exports = () => {
  const Table = require('ascii-table'),
        colors = require("colors/safe"),
        waterfall = require('async').waterfall,
        async = require('async'),
        fs = require('fs')

  const show_prompt = next => {
    prompt = require('./prompt')
    prompt.start()
    prompt.get( prompt.schema, (error, config) => {
      if(error)
        throw new Error(error)
      else
        console.log(!config.resume),
        next(null, config)
    })
  }

  const load_validate_config = (config, next) => {
    if(config.load_config) {
      try { config = require('../../config') }
      catch(e) {
        console.log("It appears you've set load_config somehow without having a config file you rascal. Duplicate the default config file and edit or set to false.")
        throw new Error(e)
      }
    }

    if(typeof config.period === "undefined") {
      let period  = require('./utilities/periods')
      let cache_period = config.period
      config.period = period.last_closed()
      console.log(colors.italic.red(`It appears you've set your period to ${cache_period}, which hasn't yet finished. Period has been changed to ${$config.period}`))
    }
    else if(config.period > CS_MAX_PERIOD_INDEX) {
      let cache_period = config.period
      config.period = CS_MAX_PERIOD_INDEX
      console.log(colors.italic.red(`It appears you've set your period to ${cache_period}, which doesn't exist. Period has been reset to ${config.period}`))
    }
    config = Object.assign( require('../../config.default'), config )
    next(null, config)
  }

  const override_config_with_params = ( config, next ) => {
    const optimist = require('optimist'),
          inspect = require('util').inspect
    config = Object.assign( config, optimist.argv )
    // console.log(inspect(config))
    next(null, config)
  }

  const run_snapshot = () => {
    let   state = {}
          state.timestamp_started = (Date.now() / 1000 | 0)

    waterfall([
      next => next(null, state),
      //Connect and check connections before starting
      require('./tasks/misc/connections'),
      //Dynamically set globals
      require('./tasks/misc/preload'),
      //Set the period map
      require('./tasks/sync/periods'),
      //Check if the crowdsale is ongoing and the token is stopped, "frozen"
      require('./tasks/sync/distribution-status'),
      //truncate all databases (except state) if config permits
      require('./tasks/sync/block-range'),
      //Sync events from the crowdsale contract
      require('./tasks/misc/truncate-db'),
      //Set the block range of the snapshot.
      require('./tasks/sync/public_keys'),
      //Calculate and validate each wallet.
      require('./tasks/sync/contract'),
      //Sync ethereum public keys from chain
      require('./tasks/sync/wallets'),
      //Deterministic Index and account names
      require('./tasks/sync/deterministic_index'),
      //Run tests against data to spot any issues with integrity
      require('./tasks/misc/tests'),
      //Maybe run native registration fallback (v0.1) NOT RECOMMENDED.
      // require('./tasks/sync/fallback'),
      //Generate output files.
      require('./tasks/export')
    ], (error, result) => {
        console.log(`Snapshot for Period #${config.period} Completed.`)
        const sync_progress_destroy = require('./queries').sync_progress_destroy
        // sync_progress_destroy().then( () => {
        //   console.log("Sync Progress Destroyed.")
          console.log(`Exiting in 10 seconds.`)
          setTimeout( () => process.exit(), 10*1000 )
        // })

      if(error)
        console.log('Error:', error)
    })

  }

  const configuration_complete = (error, config, callback) => {
    let table = new Table('Settings')
    Object.keys(config).forEach((key,index) => {
      table.addRow([key, config[key]])
    })
    console.log(colors.bold.white(table.setAlign(0, Table.RIGHT).setAlign(1, Table.LEFT).render()))
    console.log(colors.white('Starting in 5 seconds.'))
    //Save config globally
    global.config = config;
    setTimeout( callback, 5000)
  }

  const configure = (callback) => {
    waterfall(
      [ show_prompt, load_validate_config, override_config_with_params ],
      (error, config) => configuration_complete(error, config, callback)
    )
  }

  configure( run_snapshot )
}
