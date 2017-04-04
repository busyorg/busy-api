const mailgun = require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

const mail = {};

const templates = {
  confirm_email: {
    from: 'Busy <no-reply@busy.org>',
    to: 'fabien@bonustrack.co',
    subject: 'Welcome to Busy!',
    text:
      'Thanks for signing up to Busy, we are excited to have you on board!\n' +
      'To complete and confirm your registration to Busy, you need to verify your email address.\n\n' +
      '${url} \n\n' +
      'If you encounter any problem using the service, contact us and a member of our team will help you.\n\n' +
      'Cheers,\n' +
      'Busy',
  }
}

mail.send = (template, params = {}, cb) => {
  const data = templates[template];
  Object.keys(params).map((key) => {
    data.text = data.text.replace('${' + key + '}', params[key]);
    data.subject = data.subject.replace('${' + key + '}', params[key]);
  });
  mailgun.messages().send(data, (error, body) => {
    cb(error, body);
  });
}

module.exports = mail;
