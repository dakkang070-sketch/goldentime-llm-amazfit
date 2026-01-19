const jwt = require('jsonwebtoken');

function signUserToken(user) {
  const secret = process.env.JWT_SECRET || 'change-me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      sub: String(user._id),
      role: 'user',
    },
    secret,
    { expiresIn }
  );
}

function signParamedicToken(paramedic) {
  const secret = process.env.JWT_SECRET || 'change-me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      sub: String(paramedic._id),
      role: 'paramedic',
    },
    secret,
    { expiresIn }
  );
}

function signControllerToken(controller) {
  const secret = process.env.JWT_SECRET || 'change-me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      sub: String(controller._id),
      role: controller.role || 'controller',
    },
    secret,
    { expiresIn }
  );
}

module.exports = {
  signUserToken,
  signParamedicToken,
  signControllerToken,
};

