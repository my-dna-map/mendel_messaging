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
  exectingCallBack = false;


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
  emit(event, msg) {
    return new Promise((resolve, reject) => {
      msg.event = event;
      msg.source = this.source;
      msg.Id = uuid.v4();

      let open = amqp.connect(this.MQServer);

      open.then((conn) => {
        return conn.createChannel();
      })
          .then((ch) => {
            return ch.assertQueue(this.queueName)
                .then((ok) => {
                  resolve(ch.sendToQueue(this.queueName, Buffer.from(JSON.stringify(msg))));
                });
          })
          .catch(e => reject(e));
    });
  }

  /**
   * Subscribe to an specific queue
   * @param callback callback function
   * @param queue queue to subscribe
   * @returns {Promise<void>}
   */
  async subscribeToQueue(queueName, callback) {

    amqp.connect(this.MQServer)
        .then((conn) => {
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
                    .then((qok) => {
                      return ch.bindQueue(qok.queue, queueName, '')
                          .then(function () {
                            return qok.queue;
                          });
                    })
                    .then((queue) => {
                      ch.prefetch(1);
                      ch.qos(1);
                      ch.consume(queue, (msg) => {
                        try {
                          //self.messageReceived(JSON.parse(msg.content.toString()));
                          callback(JSON.parse(msg.content.toString())).then(() => {
                            ch.ack(msg);
                          });
                        } catch (ex) {
                          console.error(ex);
                        }
                      }, {noAck: false});
                    });
              });
        });
  }


  readMessageFromQueue(ch, queue, callback) {
    if (ch) {
      ch.get(queue)
          .then(msg => {
            // msg will be set to false if no messages are available on the queue.
            if (msg) {
              try {

                if (!this.exectingCallBack) {
                  ch.ack(msg);
                  this.exectingCallBack = true;
                  callback(JSON.parse(msg.content.toString())).then(() => {
                    this.exectingCallBack = false;
                    this.readMessageFromQueue(ch, queue, callback);
                  })
                      .catch(e => {
                        //ch.nack(msg, false, true);
                        // Poner el mesaje nuevamente en la cola?
                        this.exectingCallBack = false;
                        setTimeout(() => {
                          this.readMessageFromQueue(ch, queue, callback)
                        }, 1000);
                        logger.error(e);
                      })
                } else {
                  ch.nack(msg, false, true);
                  setTimeout(() => {
                    this.readMessageFromQueue(ch, queue, callback)
                  });
                }
              } catch (ex) {
                ch.nack(msg, false, true);
                setTimeout(() => {
                  this.readMessageFromQueue(ch, queue, callback)
                }, 1000);
                logger.error(ex);
              }
            } else {
              setTimeout(() => {
                this.readMessageFromQueue(ch, queue, callback)
              }, 1000);
            }

          })
          .catch(err => {
            logger.error(err);
          })

    } else {
      setTimeout(() => {
        this.readMessageFromQueue(ch, queue, callback)
      }, 1000);
    }
  }

  /**
   *
   * @param queueName
   * @param callback
   * @returns {Promise<void>}
   */
  async subscribeSingleMessageToQueue(queueName, callback) {

    amqp.connect(this.MQServer)
        .then((conn) => {
          this.consume_connection = conn;

          console.log(` ******   Connected to MQ ${this.MQServer} **********`);
          conn.createChannel()
              .then((ch) => {
                this.consume_channel = ch;
                let ok = ch.assertExchange(queueName, 'topic', {durable: false})
                    .then(() => {
                      return ch.assertQueue(queueName, {exclusive: false});
                    })
                    .then((qok) => {
                      return ch.bindQueue(qok.queue, queueName, '')
                          .then(function () {
                            return qok.queue;
                          });
                    })
                    .then((queue) => {

                      this.readMessageFromQueue(ch, queue, callback);
                    });
              });
        });
  }
}


module.exports = MendelMessaging;