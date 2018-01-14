const express = require('express');
const router = express.Router();

router.all('/rpc', async (req, res) => {
  const { method, params = [], id = 1 } = req.body;
  let cache = true;
  let result = req.cache.get('steemd', [method, params]);
  if (!result) {
    try {
      cache = false;
      result = await req.client.sendAsync(method, params);
      req.cache.set('steemd', [method, params], result);
    } catch (err) {
      console.log([method, params], err);
    }
  }
  res.json({
    jsonrpc: '2.0',
    id,
    cache,
    method,
    result,
  });
});

module.exports = router;
