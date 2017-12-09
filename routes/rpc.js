const express = require('express');
const router = express.Router();

router.all('/rpc', (req, res) => {
  console.log(req.body);
  const body = JSON.parse(req.body);
  const { method, params, id } = body;
  console.log(body);
  req.client.send(method, params, (err, result) => {
    if (err !== null) console.error(err);
    // console.log('response', result);
    res.json({
      jsonrpc: '2.0',
      id,
      method,
      result,
    });
  });
});

module.exports = router;
