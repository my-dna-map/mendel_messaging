"use strict";

const AWS = require("aws-sdk");
const {Consumer} = require('sqs-consumer');
const uuid = require('uuid');

/**
 * Base class for all queue messaging.
 * TODO: to be re implemented.
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
   * Put an message into the message queue
   * @param msg message to be posted on queue (message will be altered with tow new fields. event and source)
   * @returns {Promise<void>}
   */
  async emit(event, msg) {
    msg.event = event;
    msg.source = this.source;

    let params = {
      MessageBody: JSON.stringify(msg),
      MessageGroupId:uuid.v4(),
      MessageDeduplicationId:uuid.v4(),
      QueueUrl: this.config.QueueUrl
    };
    let r = await this.sqs.sendMessage(params).promise();
    return r;
  }

  /**
   * Subscribe to an specific queue
   * @param callback callback function
   * @param queue queue to subscribe
   * @returns {Promise<void>}
   */
  async subscribeToQueue(queue, callback) {
    const app = Consumer.create({
      queueUrl: queue,
      sqs: this.sqs,
      handleMessage: async (message) => {
        try {
          callback(JSON.parse(message.Body));
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