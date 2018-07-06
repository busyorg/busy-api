const Expo = require('expo-server-sdk');
const _ = require('lodash');
const redis = require('./redis');
const notificationTypes = require('./constants').notificationTypes;

const expo = new Expo();

const sendAllNotifications = (notifications) => {
  // Collect notifications by user
  const userNotifications = {};
  notifications.forEach((notification) => {
    const user = notification[0];
    if (!userNotifications[user]) {
      userNotifications[user] = [];
    }
    userNotifications[user].push(notification);
  });

  Object.keys(userNotifications).forEach((user) => {
    const currentUserNotifications = userNotifications[user];
    redis.smembersAsync(`tokens:${user}`)
      .then(async (tokens) => {
        const messages = [];
        currentUserNotifications.forEach((currentUserNotification) => {
          tokens.forEach(token => messages.push(
            getNotificationMessage(currentUserNotification, token),
          ));
        });
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            const resp = await expo.sendPushNotificationsAsync(chunk);
            console.log('Expo chunk set', resp);
          } catch (error) {
            console.log('Error sending expo chunk', error);
          }
        }
      });
  });
};

const getNotificationMessage = (notification, token) => {
  const data = notification[1];
  const template = { to: token, data };

  let message = {};
  switch (notification[1].type) {
    case notificationTypes.VOTE:
      message = {
        body: data.weight > 0
          ? `${data.voter} upvoted your post.`
          : `${data.voter} downvoted your post.`,
      };
      break;

    case notificationTypes.TRANSFER:
      message = {
        body: `${data.from} sent you ${data.amount}.`,
      };
      break;

    case notificationTypes.REPLY:
      message = {
        body: `${data.author} replied to your post.`,
      };
      break;

    case notificationTypes.FOLLOW:
      message = {
        body: `${data.follower} followed you.`,
      };
      break;

    case notificationTypes.REBLOG:
      message = {
        body: `${data.account} reblogged your post.`
      };
      break;

    case notificationTypes.MENTION:
      message = {
        body: `${data.author} mentioned you in a ` + (data.is_root_post ? 'post.' : 'comment.'),
      };
      break;

    default:
      message = {
        body: 'Something happened in the app.',
      };
  }

  return { ...template, message };
};

module.exports = {
  expo,
  sendAllNotifications,
  getNotificationMessage,
};
