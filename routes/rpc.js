const express = require('express');
const router = express.Router();

router.all('/rpc', async (req, res) => {
  const { method, params = [], id = 1 } = req.body;
  const result = await req.client.sendAsync(params[1], params[2]);
  res.json({
    jsonrpc: '2.0',
    id,
    method,
    result,
  });
});

module.exports = router;
