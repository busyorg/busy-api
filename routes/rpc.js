const express = require('express');
const Cache = require('../helpers/cache');

const router = express.Router();
const cache = new Cache();

router.all('/rpc', async (req, res) => {
  const start = Date.now();
  const { method, params = [], id = 1 } = req.body;
  let fromCache = true;
  let result = cache.get('steemd', [method, params]);
  if (!result) {
    fromCache = false;
    try {
      result = await req.client.sendAsync(method, params);
    } catch (err) {
      console.log([method, params], err);
    }
  }
  const ms = Date.now() - start;
  res.json({
    jsonrpc: '2.0',
    id,
    from_cache: fromCache,
    ms,
    method,
    result,
  });
  if (!fromCache && result) {
    cache.set('steemd', [method, params], result);
  }
});

module.exports = router;
