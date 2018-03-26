module.exports = ( state, complete ) => {

  const async = require('async'),
        db = require('../../models')

  if(config.recalculate_wallets === true) {
    console.log('recalculate_wallets set to true, skipping truncation')
    db.Wallets.destroy({ truncate : true, cascade: false }).then(() => {
      complete(null, state)
    })
    return
  }

  console.log('Truncating tables, starting clean')
  async.series([
    next => db.Wallets.destroy({ truncate : true, cascade: false }).then(next),
    next => db.Transfers.destroy({ truncate : true, cascade: false }).then(next),
    next => db.Claims.destroy({ truncate : true, cascade: false }).then(next),
    next => db.Buys.destroy({ truncate : true, cascade: false }).then(next),
    next => db.Reclaimables.destroy({ truncate : true, cascade: false }).then(next),
    next => db.Registrations.destroy({ truncate : true, cascade: false }).then(next)
  ], () => complete( null, state ) )

}
