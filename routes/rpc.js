const express = require('express');
const router = express.Router();

router.all('/rpc', async (req, res) => {
  const start = Date.now();
  const { method, params = [], id = 1 } = req.body;
  let cache = true;
  let result = req.cache.get('steemd', [method, params]);
  if (!result) {
    cache = false;
    try {
      result = await req.client.sendAsync(method, params);
      req.cache.set('steemd', [method, params], result);
    } catch (err) {
      console.log([method, params], err);
    }
  }
  const ms = Date.now() - start;
  res.json({
    jsonrpc: '2.0',
    id,
    cache,
    ms,
    method,
    result,
  });
});

module.exports = router;
