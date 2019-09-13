"use strict";

const AWS = require("aws-sdk");
const {Consumer} = require('sqs-consumer');

process.chdir(__dirname);
if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR = process.cwd() + "/../config";
}

/**
 *
 *
 */
class MendelMessaging {
  config = null;
  source = null;
  sqs = null;

  /**
   *
   * @param source
   * @param config
   */
  constructor(source, config) {
    this.source = source;
    this.config = config ? config : require("config");
    this.config = config.aws;
    AWS.config.update(this.config.auth.credentials);
    this.sqs = new AWS.SQS();

  }

  /**
   *
   * @param msg
   * @returns {Promise<void>}
   */
  async postMessage(msg) {
    msg.event = "add_file";
    msg.source = this.source;

    let params = {
      MessageBody: JSON.stringify(msg),
      QueueUrl: this.config.QueueUrl
    };
    let r = await this.sqs.sendMessage(params).promise();
  }

  /**
   *
   * @param f
   * @param queue
   * @returns {Promise<void>}
   */
  async subscribeToQueue(f, queue) {
    const app = Consumer.create({
      queueUrl: queue,
      handleMessage: async (message) => {
        try {
          f(JSON.parse(message.Body));
        } catch (ex) {
          if (logger) {
            logger.error(ex.message);
          }
        }
      }
    });

    app.on('error', (err) => {
      if (logger) {
        logger.error(err.message);

      }
    });

    app.on('processing_error', (err) => {
      if (logger) {
        logger.error(err.message);
      }
    });

    app.start();
  }


}


module.exports = MendelMessaging;