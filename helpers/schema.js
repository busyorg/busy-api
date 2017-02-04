
module.exports = {
  signup: {
    id: 'signup',
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
      },
      password: {
        type: 'string',
        minLength: 6,
        maxLength: 128
      }
    },
    required: ['email', 'password'],
  }
};