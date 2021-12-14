const Moralis = require('moralis/node');
const _ = require('lodash');
const log = require('../utils/logger')(module);
const { logAgendaActionStart } = require('../utils/agenda_action_logger');
const { getABIData } = require('../utils/helpers');
const { erc721Abi } = require('../integrations/ethers/contracts');

const lockLifetime = 1000 * 60 * 5;

module.exports = (context) => {
  context.agenda.define('sync products', { lockLifetime }, async (task, done) => {
    try {
      logAgendaActionStart({agendaDefinition: 'sync products'});
      const { network, name } = task.attrs.data;
      const productsForSave = [];
      let block_number = [];
      const networkData = context.config.blockchain.networks[network];
      const { serverUrl, appId } = context.config.blockchain.moralis[networkData.testnet ? 'testnet' : 'mainnet'];
      const { abi, topic } = getABIData(erc721Abi, 'event', 'ProductCreated');
      const version = await context.db.Versioning.findOne({ name: 'sync products', network });

      const generalOptions = {
        chain: networkData.network,
        topic,
        abi,
        from_block: _.get(version, ['number'], 0)
      };
      const arrayOfContracts = await context.db.Contract.find({ blockchain: network }, { _id: 1, contractAddress: 1 });

      // Initialize moralis instances
      Moralis.start({ serverUrl, appId });

      await Promise.all(_.map(arrayOfContracts, async item => {
        const { _id, contractAddress: contract } = item;
        const options = {
          address: contract,
          ...generalOptions
        };
        const events = await Moralis.Web3API.native.getContractEvents(options);

        await Promise.all(_.map(events.result, async product => {
          const { uid, name, startingToken, length } = product.data;

          productsForSave.push({
            contract: _id,
            collectionIndexInContract: uid,
            name,
            copies: length,
            firstTokenIndex: startingToken
          });

          block_number.push(Number(product.block_number));
        }));
      }));

      if (!_.isEmpty(productsForSave)) {
        try {
          await context.db.Product.insertMany(productsForSave, { ordered: false });
        } catch (e) {}
      }

      if (!_.isEmpty(block_number)) {
        await context.db.Versioning.updateOne({
          name: 'sync products',
          network
        }, { number: _.chain(block_number).sortBy().last().value() }, { upsert: true });
      }

      return done();
    } catch (e) {
      log.error(e);
      return done(e);
    }
  });
};
