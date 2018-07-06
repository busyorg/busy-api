const Client = require('lightrpc');
const bluebird = require('bluebird');
const client = new Client('https://api.steemit.com');
bluebird.promisifyAll(client);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const getBlock = (blockNum) => client.sendAsync({ method: 'get_block', params: [blockNum] }, null);

const getOpsInBlock = (blockNum, onlyVirtual = false) => client.sendAsync({ method: 'get_ops_in_block', params: [blockNum, onlyVirtual] }, null);

const getGlobalProps = () => client.sendAsync({ method: 'get_dynamic_global_properties', params: [] }, null);

const mutliOpsInBlock = (start, limit, onlyVirtual = false) => {
  const request = [];
  for (let i = start; i < start + limit; i++) {
    request.push({ method: 'get_ops_in_block', params: [i, onlyVirtual] });
  }
  return client.sendBatchAsync(request, { timeout: 20000 });
};

const getBlockOps = (block) => {
  const operations = [];
  block.transactions.forEach(transaction => {
    operations.push(...transaction.operations);
  });
  return operations;
};

module.exports = {
  sleep,
  getBlock,
  getOpsInBlock,
  getGlobalProps,
  mutliOpsInBlock,
  getBlockOps,
};
