module.exports = (state, all_systems_go) => {

  const async     = require('async'),
        colors    = require('colors/safe'),
        _util      = require('util')

  const util = require('util')

  const connect = () => {
    async.series([
      connect_redis,
      connect_mysql,
      connect_web3_connected,
      connect_web3_synced
    ], () => all_systems_go(null, state) )
  }

  const connect_redis = connected => {
    if( !config.registration_fallback ) {
      connected() //skip
      return false
    }

    const check = () => {
      try {
        const redis = require('../../services/redis')
        global.redis = redis(config.redis_host, config.redis_port)
        return true
      }
      catch(e) {
        return false
      }
    }

    if(check())
      console.log(colors.green.bold('Redis: Connected')),
      connected()
    else
      console.log(colors.red.bold(`Redis: Not Connected (trying again in 5 seconds)`)),
      setTimeout( check, 1000*5 )

  }

  const connect_mysql = connected => {
    const mysql = require('../../services/mysql')

    const check = () => {
      global.mysql = mysql(config.mysql_db, config.mysql_user, config.mysql_pass, config.mysql_host, config.mysql_port)
      return global.mysql.authenticate()
    }

    const not_connected = retry => {
      console.log(colors.red.bold(`MySQL: Not Connected (trying again in 5 seconds)`)),
      setTimeout( retry, 1000*5 )
    }

    check()
      .then( () => {
          console.log(colors.green.bold('MySQL: Connected')),
          connected()
      })
      .catch( e => not_connected( () => connect_mysql(connected) ) )
  }

  const connect_web3_connected = connected => {
    const web3 = require('../../services/web3')

    const check = () => {
      global.web3 = web3(config.eth_node_type, config.eth_node_path)
      return global.web3.eth.net.isListening()
    }

    const not_connected = retry => {
      console.log(colors.red.bold(`Web3: Not Connected (trying again in 5 seconds)`)),
      setTimeout( retry, 1000*5 )
    }

    check()
      .then( () => {
          console.log(colors.green.bold('Web3: Connected')),
          connected()
      })
      .catch( () => { not_connected( () => connect_web3_connected(connected) ) })
  }

  const connect_web3_synced = synced => {
    const check = () => {
      global.web3.eth.isSyncing().then( syncing => {
        if(!syncing)
          console.log(colors.green.bold(`Web3: Synced`)),
          synced()
        else if (config.skip_web3_sync)
          console.log(colors.yellow.bold(`Web3: Skipping Sync`)),
          synced()
        else
          console.log(colors.red.bold(`Web3 is Still Syncing (At Block #${syncing.currentBlock}). trying again in 30 seconds`)),
          setTimeout( check, 1000*30)
      })
      .catch( e => setTimeout( check, 1000*30 ) )
    }
    check()
  }

  connect()

}
