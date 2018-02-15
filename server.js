const express = require('express');
const SocketServer = require('ws').Server;
const { Client } = require('busyjs');

const port = process.env.PORT || 4000;
const steemdWsUrl = process.env.STEEMD_WS_URL || 'wss://rpc.buildteam.io';
const server = express().listen(port, () => console.log(`Listening on ${port}`));
const wss = new SocketServer({ server });
const client = new Client(steemdWsUrl);
const cache = {};

wss.on('connection', (ws) => {
  console.log('Got connection from new peer');
  ws.on('message', (message) => {
    console.log('Message', message);
    const call = JSON.parse(message);
    const key = new Buffer(JSON.stringify([call.method, call.params])).toString('base64');
    if (!cache[key]) {
      client.call(call.method, call.params, (err, result) => {
        ws.send(JSON.stringify({ id: call.id, result }));
        cache[key] = result;
      });
    } else {
      ws.send(JSON.stringify({ id: call.id, cache: true, result: cache[key] }));
    }
  });
  ws.on('error', () => console.log('Error on connection with peer'));
  ws.on('close', () => console.log('Connection with peer closed'));
});
