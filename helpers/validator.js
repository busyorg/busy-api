const ZSchema = require('z-schema');
const validator = require('validator');

ZSchema.registerFormat('email', function (str) {
  return validator.isEmail(str);
});

const helper = new ZSchema({
  reportPathAsArray: true
});

helper.errorObject = (errors) => {
  const err = {};
  errors.map(error => {
    const param = error.path[0] || error.params[0];
    err[param] = err[param] ? err[param] : [];
    err[param].push(error.code);
  });
  return err;
};

module.exports = helper;
