const Sequelize    = require('sequelize'),
      Op           = Sequelize.Op,
      async        = require('async'),
      bn           = require('bignumber.js'),
      db           = require('./models')

      query = {}

// Wallet queries
query.wallets_bulk_upsert = ( wallets ) => {
  return db.Wallets.bulkCreate( wallets, { updateOnDuplicate: true })
}

query.address_uniques = ( block_begin, block_end, callback ) => {
  let query = `SELECT \`from\` FROM transfers WHERE block_number>=${block_begin} AND block_number<=${block_end}
  UNION SELECT \`to\` FROM transfers WHERE block_number>=${block_begin} AND block_number<=${block_end}
  UNION SELECT address FROM claims WHERE block_number>=${block_begin} AND block_number<=${block_end}
  UNION SELECT address FROM buys WHERE block_number>=${block_begin} AND block_number<=${block_end};`
  console.log(query)
  db.sequelize
    .query(query, {type: db.sequelize.QueryTypes.SELECT})
    .then( results => {
      addresses = results.map( result => result.address || result.from || result.to  )
      callback( addresses )
    })
}

query.last_register = (address, begin, end, callback) => {
  db.Registrations
    .findAll({
      attributes: ['eos_key'],
      where: {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      },
      order: [['block_number', 'DESC']],
      limit: 1
    })
    .then( results => callback( results.length ? results[0].dataValues.eos_key : null ) )
}

// Address qeuries
query.address_claims = (address, begin, end) => {
  return db.Claims
    .findAll({
      where : {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

query.address_buys = (address, begin, end) => {
  return db.Buys
    .findAll({
      where : {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

query.address_transfers_in = (address, begin, end) => {
  return db.Transfers
    .findAll({
      attributes: ['eos_amount'],
      where: {
        to: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    }, {type: db.sequelize.QueryTypes.SELECT})
}

query.address_transfers_out = (address, begin, end) => {
  return db.Transfers
    .findAll({
      attributes: ['eos_amount'],
      where: {
        from: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    }, {type: db.sequelize.QueryTypes.SELECT})
}

query.address_reclaimables = (address, begin, end) => {
  return db.Reclaimables
    .findAll({
      attributes: ['eos_amount'],
      where: {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

//tx range queries
query.transfers_in_range = (begin, end) => {
  return db.Transfers
    .findAll({
      attributes: ['from', 'to'],
      where: {
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

query.registrations_in_range = (begin, end) => {
  return db.Registrations
    .findAll({
      attributes: ['address'],
      where: {
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

query.buys_in_range = (begin, end) => {
  return db.Buys
    .findAll({
      attributes: ['address'],
      where: {
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

query.claims_in_range = (begin, end) => {
  return db.Claims
    .findAll({
      attributes: ['address'],
      where: {
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

query.destroy_above_block = (block_number, callback) => {
  async.series([
    next => db.Buys.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next),
    next => db.Claims.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next),
    next => db.Transfers.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next),
    next => db.Registrations.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next),
    next => db.Unclaimables.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next)
  ], () => {
    callback()
  })
}

query.supply_liquid = () => {
  let query = `SELECT sum(balance_total) FROM wallets WHERE address!="${CS_ADDRESS_TOKEN}" AND address!="${CS_ADDRESS_CROWDSALE}"`
  if(!config.include_b1)
    query = `${query} AND address!="${CS_ADDRESS_B1}"`
  return db.sequelize.query(query, {type: db.sequelize.QueryTypes.SELECT})
}

query.count_accounts_registered = () => {
  return db.Wallets
    .count({
      where: { registered: true, valid: true  }
    })
}

module.exports = query
