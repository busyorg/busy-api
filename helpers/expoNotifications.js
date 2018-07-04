const Expo = require('expo-server-sdk');
const _ = require('lodash');
const redis = require('./redis');
const notificationTypes = require('./constants').notificationTypes;

const expo = new Expo();

const sendAllNotifications = (notifications) => {
	const users = _.uniq(notifications.map(notification => notification[0]));

	users.forEach(user => {
		const userNotifications = notifications.filter(notification => notification[0] === user);
		redis.lrangeAsync(`tokens:${user}`, 0, -1)
			.then((userTokens) => {
				const messages = [];
				userNotifications.forEach((uesrNotification) => {
					userTokens.forEach((userToken) => {
						messages.push(getNotificationMessage(uesrNotification, userToken));
					});
				});
				const chunks = expo.chunkPushNotifications(messages);
				for (let chunk of chunks) {
					expo.sendPushNotificationsAsync(chunk)
						.then(response => console.log('Expo Chunk Sent', response));
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
