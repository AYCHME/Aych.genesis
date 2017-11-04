const Sequelize    = require('Sequelize')
const Op           = Sequelize.Op
const async        = require('async')
const bn           = require('bignumber.js')

let db             = require('./models')

const query = {}

// Wallet queries
query.wallets_bulk_upsert = ( wallets ) => {
  let Wallets = require('./models').Wallets
  return Wallets.bulkCreate( wallets, { updateOnDuplicate: true })
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
  let db = require('./models')
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

module.exports = query
