"use strict";

process.chdir(__dirname);
if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR = process.cwd() + "/../config";
}


module.exports = require('./src/MendelMessaging');