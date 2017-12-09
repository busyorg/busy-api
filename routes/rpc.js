const express = require('express');
const router = express.Router();

router.all('/rpc', (req, res) => {
  const { method, params = [], id = 1 } = req.body;
  req.client.send(params[1], params[2], (err, result) => {
    if (err !== null) console.error(err);
    res.json({
      jsonrpc: '2.0',
      id,
      method,
      result,
    });
  });
});

module.exports = router;
