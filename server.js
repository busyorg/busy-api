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

const limit = 100;

function clearGC() {
  try {
    global.gc();
  } catch (e) {
    console.log("You must run program with 'node --expose-gc index.js' or 'npm start'");
  }
}

setInterval(clearGC, 60 * 1000);

/** Init websocket server */

wss.on('connection', (ws) => {
  console.log('Got connection from new peer');
  ws.on('message', (message) => {
    console.log('Message', message);
    const call = JSON.parse(message);
    const key = new Buffer(JSON.stringify([call.method, call.params])).toString('base64');
    if (call.method === 'get_notifications' && call.params && call.params[0]) {
      redis.lrangeAsync(`notifications:${call.params[0]}`, 0, -1).then((res) => {
        console.log('Send notifications', call.params[0], res.length);
        const notifications = res.map((notification) => JSON.parse(notification));
        ws.send(JSON.stringify({ id: call.id, cache: true, result: notifications }));
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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const getRedisOperations = (ops) => {
  const notifications = [];
  ops.forEach((op) => {
    const type = op.op[0];
    const params = op.op[1];
    switch (type) {
      case 'comment': {
        const isRootPost = !params.parent_author;

        /** Find replies */
        if (!isRootPost) {
          const notification = {
            type: 'reply',
            parent_permlink: params.parent_permlink,
            author: params.author,
            permlink: params.permlink,
            timestamp: Date.parse(op.timestamp) / 1000,
            block: op.block,
          };
          notifications.push([params.parent_author, notification]);
        }

        /** Find mentions */
        const pattern = /(@[a-z][-\.a-z\d]+[a-z\d])/gi;
        const content = `${params.title} ${params.body}`;
        const mentions = _.without(_.uniq(content.match(pattern))
          .join('@')
          .toLowerCase()
          .split('@')
          .filter(n => n), params.author)
          .slice(0, 9); // Handle maximum 10 mentions per post
        if (mentions.length) {
          mentions.forEach(mention => {
            const notification = {
              type: 'mention',
              is_root_post: isRootPost,
              author: params.author,
              permlink: params.permlink,
              timestamp: Date.parse(op.timestamp) / 1000,
              block: op.block,
            };
            notifications.push([mention, notification]);
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
              const notification = {
                type: 'follow',
                follower: json[1].follower,
                timestamp: Date.parse(op.timestamp) / 1000,
                block: op.block,
              };
              notifications.push([json[1].following, notification]);
            }
            break;
          }
        }
        break;
      }
    }
  });

  /** Create redis operations array */
  const operations = [];
  notifications.forEach((notification) => {
    operations.push(['lpush', `notifications:${notification[0]}`, JSON.stringify(notification[1])]);
    operations.push(['ltrim', `notifications:${notification[0]}`, 0, limit - 1]);
  });
  return operations;
};

const catchup = (blockNumber) => {
  lightrpc.sendAsync('get_ops_in_block', [blockNumber, false]).then(ops => {
    if (!ops.length) {
      console.error('Block does not exit?', blockNumber);
      lightrpc.sendAsync('get_block', [blockNumber]).then(block => {
        if (block && block.transactions.length === 0) {
          console.log('Block exist and is empty, load next', blockNumber);
          redis.setAsync('last_block_num', blockNumber).then(() => {
            catchup(blockNumber + 1);
          }).catch(err => {
            console.error('Redis set last_block_num failed', err);
            catchup(blockNumber);
          });
        } else {
          console.log('Sleep and retry', blockNumber);
          sleep(2000).then(() => {
            catchup(blockNumber);
          });
        }
      }).catch(err => {
        console.error('Error get_block', err);
        console.log('Retry', blockNumber);
        catchup(blockNumber);
      });
    } else {
      const operations = getRedisOperations(ops);
      operations.push(['set', 'last_block_num', blockNumber]);
      redis.multi(operations).execAsync().then(() => {
        console.log('Block', blockNumber, 'notification stored', operations.length - 1);
        console.log(operations);
        catchup(blockNumber + 1);
      }).catch(err => {
        console.error('Redis store notification multi failed', err);
        catchup(blockNumber);
      });
    }
  }).catch(err => {
    console.error('Call failed with lightrpc', err);
    console.log('Retry', blockNumber);
    catchup(blockNumber);
  });
};

const start = () => {
  redis.getAsync('last_block_num').then((res) => {
    let lastBlockNum = (res === null)? 20000000 : parseInt(res) + 1;
    catchup(lastBlockNum);
  }).catch(err => {
    console.error('Redis get last_block_num failed', err);
  });
};

// redis.flushallAsync();
start();