"use strict";


if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR =  `${__dirname}/../config`;
}


module.exports = require('./src/MendelMessaging');