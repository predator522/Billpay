const Joi = require('joi');

const validateSignup = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  req.validated = value;
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  req.validated = value;
  next();
};

const validateAirtimeBuy = (req, res, next) => {
  const schema = Joi.object({
    network: Joi.string().valid('MTN', 'AIRTEL', 'GLO', '9MOBILE').required(),
    phone: Joi.string().pattern(/^234\d{10}$|^\d{11}$/).required().messages({
      'string.pattern.base': 'Phone must be 11 digits starting with 0 or 10 digits starting with 234',
    }),
    amount: Joi.number().min(50).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  req.validated = value;
  next();
};

const validateDataBuy = (req, res, next) => {
  const schema = Joi.object({
    network: Joi.string().valid('MTN', 'AIRTEL', 'GLO', '9MOBILE').required(),
    phone: Joi.string().pattern(/^234\d{10}$|^\d{11}$/).required(),
    plan: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  req.validated = value;
  next();
};

const validateManualFund = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number().min(100).required(),
    user_note: Joi.string().max(500),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  req.validated = value;
  next();
};

module.exports = {
  validateSignup,
  validateLogin,
  validateAirtimeBuy,
  validateDataBuy,
  validateManualFund,
};