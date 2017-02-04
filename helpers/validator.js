const zSchema = require('z-schema');
const validator = require('validator');

zSchema.registerFormat('email', function (str) {
  return validator.isEmail(str);
});

module.exports = new zSchema();
