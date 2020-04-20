"use strict";


const uuid = require('uuid');

const amqp = require('amqplib');



/**
 * Base class for all queue messaging.
 * TODO: to be re implemented.
 *
 */
class MendelMessaging {
  config = null;
  source = null;
  consume_connection = null;
  consume_channel = null;
  MQServer = "mq.mydnamap.com";
  queueName = 'HPC';


  /**
   *
   * @param source
   * @param config
   */
  constructor(source, config) {
    this.source = source;
    this.config = config ? config : require("config");
    this.config = this.config.mq;
    this.MQServer = this.config.MQServer;
    this.queueName = this.config.queueName;
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
  async subscribeToQueue(queueName, callback) {

    amqp.connect(this.MQServer)
        .then( (conn) => {
          this.consume_connection = conn;

          console.log(` ******   Connected to MQ ${this.MQServer} **********`);
          conn.on('error', (err) => {
            console.log("ERROR: %s", err);
            conn.close();
            setTimeout(function () {
              //self.consume();
            }, 50000);
          });

          conn.on("closed", () => {
            console.log("Connection Closed");
            setTimeout(function () {
              //self.consume();
            }, 50000);
          });

          conn.createChannel()
              .then((ch) => {
                this.consume_channel = ch;
                var ok = ch.assertExchange(queueName, 'topic', {durable: false})
                    .then(() => {
                      return ch.assertQueue(queueName, {exclusive: false});
                    })
                    .then( (qok) => {
                      return ch.bindQueue(qok.queue, queueName, '')
                          .then(function () {
                            return qok.queue;
                          });
                    })
                    .then( (queue) => {
                      ch.prefetch(1);
                      ch.consume(queue, (msg) =>  {
                        try {
                          //self.messageReceived(JSON.parse(msg.content.toString()));
                          callback(JSON.parse(msg.content.toString()));
                          ch.ack(msg);
                        } catch (ex) {
                          console.error(ex);
                        }
                      }, {noAck: false});
                    });
              });
        });

  }
}

module.exports = MendelMessaging;