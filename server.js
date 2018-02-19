const _ = require('lodash');
const express = require('express');
const SocketServer = require('ws').Server;
const { Client } = require('busyjs');
const { createClient } = require('lightrpc');
const bluebird = require('bluebird');
const redis = require('./helpers/redis');

const lightrpc = createClient('https://api.steemit.com');
bluebird.promisifyAll(lightrpc);
const port = process.env.PORT || 4000;
const steemdWsUrl = process.env.STEEMD_WS_URL || 'wss://rpc.buildteam.io';

const server = express().listen(port, () => console.log(`Listening on ${port}`));
const wss = new SocketServer({ server });
const client = new Client(steemdWsUrl);
const cache = {};
const useCache =  false;

const limit = 99; // 3

/** Init websocket server */

wss.on('connection', (ws) => {
  console.log('Got connection from new peer');
  ws.on('message', (message) => {
    console.log('Message', message);
    const call = JSON.parse(message);
    const key = new Buffer(JSON.stringify([call.method, call.params])).toString('base64');
    if (call.method === 'get_notifications' && call.params && call.params[0]) {
      redis.lrangeAsync(`notifications:${call.params[0]}`, 0, -1).then((res) => {
        ws.send(JSON.stringify({ id: call.id, cache: true, result: res }));
      }).catch(err => {
        console.log('Redis get_notifications failed', err);
      });
    } else if (useCache && cache[key]) {
      ws.send(JSON.stringify({ id: call.id, cache: true, result: cache[key] }));
    } else {
      client.call(call.method, call.params, (err, result) => {
        ws.send(JSON.stringify({ id: call.id, result }));
        if (useCache) {
          cache[key] = result;
        }
      });
    }
  });
  ws.on('error', () => console.log('Error on connection with peer'));
  ws.on('close', () => console.log('Connection with peer closed'));
});

/** Stream the blockchain */

const handleOperations = (ops) => {
  ops.forEach((op) => {
    const type = op.op[0];
    const params = op.op[1];
    switch (type) {
      case 'comment': {
        const isRootPost = !params.parent_author;

        /** Find replies */
        if (!isRootPost) {
          console.log('Reply', params.parent_author, 'in', params.author, params.permlink);
          const notification = {
            type: 'reply',
            parent_permlink: params.parent_permlink,
            author: params.author,
            permlink: params.permlink,
            timestamp: Date.parse(op.timestamp) / 1000,
          };
          handleNotification(params.parent_author, notification);
        }

        /** Find mentions */
        const pattern = /(@[a-z][-\.a-z\d]+[a-z\d])/gi;
        const content = `${params.title} ${params.body}`;
        const mentions = _.without(_.uniq(content.match(pattern))
          .join('@')
          .toLowerCase()
          .split('@')
          .filter(n => n), params.author);
        if (mentions.length) {
          mentions.forEach(mention => {
            console.log('Mention', mention, 'in', params.author, params.permlink);
            const notification = {
              type: 'mention',
              is_root_post: isRootPost,
              author: params.author,
              permlink: params.permlink,
              timestamp: Date.parse(op.timestamp) / 1000,
            };
            handleNotification(mention, notification);
          });
        }
        break;
      }
      case 'custom_json': {
        let json = {};
        try {
          json = JSON.parse(params.json);
        } catch (err) {
          console.log('Wrong json format on custom_json', err);
        }
        switch (params.id) {
          case 'follow': {
            /** Find follow */
            if (json[0] === 'follow' && json[1].follower && json[1].following && _.has(json, '[1].what[0]') && json[1].what[0] === 'blog') {
              console.log('Follow', json[1].following, json[1].follower);
              const notification = {
                type: 'follow',
                follower: json[1].follower,
                timestamp: Date.parse(op.timestamp) / 1000,
              };
              handleNotification(json[1].following, notification);
            }
            break;
          }
        }
        break;
      }
    }
  });
};

const handleNotification = (to, notification) => {
  redis.lpushAsync(`notifications:${to}`, JSON.stringify(notification)).then(() => {
    redis.ltrimAsync(`notifications:${to}`, 0, limit).catch(err => {
      console.log('Redis ltrim error', err);
    });
  }).catch(err => {
    console.log('Redis lpush error', err);
  });
};

const catchup = (blockNumber) => {
  lightrpc.sendAsync('get_ops_in_block', [blockNumber, false]).then(ops => {
    if (!ops.length) {
      console.error('Block does not exit?');
      lightrpc.sendAsync('get_block', [blockNumber]).then(block => {
        if (block && block.transactions.length === 0) {
          console.log('Block exist and is empty, load next', blockNumber);
          return catchup(blockNumber + 1);
        } else {
          console.log('Retry', blockNumber);
          return catchup(blockNumber);
        }
      }).catch(err => {
        console.log('Retry', blockNumber);
        return catchup(blockNumber);
      });
    } else {
      console.log('Block loaded', blockNumber);
      redis.setAsync('last_block_num', blockNumber).then(() => {
        handleOperations(ops);
        return catchup(blockNumber + 1);
      }).catch(err => {
        console.log('Redis set last_block_num failed', err);
      });
    }
  }).catch(err => {
    console.error('Call failed with lightrpc', err);
    console.log('Retry', blockNumber);
    return catchup(blockNumber);
  });
};

const start = () => {
  redis.getAsync('last_block_num').then((res) => {
    let lastBlockNum = (res === null)? 19900000 : res;
    catchup(lastBlockNum);
  }).catch(err => {
    console.log('Redis get last_block_num failed', err);
  });
};

// redis.flushallAsync();
start();