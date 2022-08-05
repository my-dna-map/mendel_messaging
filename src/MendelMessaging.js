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
    MQServer = "mq.mydnamap.com";
    queueName = 'HPC';


    /**
     *
     * @param source
     * @param config
     */
    constructor(source, config, queueName = null) {
        this.source = source;
        this.config = config ? config : require("config");
        this.config = this.config.mq;
        this.MQServer = this.config.MQServer;
        if (!queueName) {
            this.queueName = this.config.queueName;
        } else {
            this.queueName = queueName
        }
        if (logger) {
            logger.info(`Using queue ${this.queueName}`);
        }
    }


    /**
     * Put an message into the message queue
     * @param msg message to be posted on queue (message will be altered with tow new fields. event and source)
     * @returns {Promise<void>}
     */
    emitOLD(event, msg) {
        return new Promise((resolve, reject) => {
            msg.event = event;
            msg.source = this.source;
            msg.Id = uuid.v4();
            let queueName = msg.queue ? msg.queue : this.queueName;

            let open = amqp.connect(this.MQServer);

            open.then((conn) => {
                return conn.createChannel();
            })
                .then((ch) => {
                    return ch.assertQueue(queueName)
                        .then((ok) => {
                            resolve(ch.sendToQueue(queueName, Buffer.from(JSON.stringify(msg))));
                        });
                })
                .catch(e => reject(e));
        });
    }

    /**
     *
     * @param event
     * @param msg
     * @returns {Promise<unknown>}
     */
    emit(event, msg) {
        return new Promise((resolve, reject) => {
            msg.event = event;
            msg.source = this.source;
            msg.Id = uuid.v4();
            let queueName = msg.queue ? msg.queue : this.queueName;

            let open = amqp.connect(this.MQServer);
            open.then((conn) => {
                return conn.createChannel();
            })
                .then((ch) => {
                    return ch.assertExchange(queueName, 'fanout', {durable: false})
                        .then((ok) => {
                            ch.publish(queueName, '', Buffer.from(JSON.stringify(msg)))
                            ch.close();
                            resolve();
                        });
                })
                .catch(e =>  {
                    if (logger) {
                        logger.error(e);
                    }
                    reject(e)
                });
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

                logger?.info(` ******   Connected to MQ ${this.MQServer} Queue ${queueName} **********`);
                conn.on('error', (err) => {
                    logger?.error("ERROR: %s", err);
                    conn.close();
                    setTimeout(function () {
                        //self.consume();
                    }, 50000);
                });

                conn.on("closed", () => {
                    logger?.info ("Connection Closed")
                    setTimeout(function () {
                        //self.consume();
                    }, 50000);
                });

                conn.createChannel()
                    .then((ch) => {
                        let ok = ch.assertExchange(queueName, 'fanout', {durable: false})
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
                                // ch.prefetch(1);
                                //ch.qos(1);
                                ch.consume(queue, (msg) => {
                                    try {
                                        callback(JSON.parse(msg.content.toString())).then(() => {
                                            ch.ack(msg);
                                        });
                                    } catch (ex) {
                                        logger?.error(ex);
                                    }
                                }, {noAck: false});
                            });
                    });
            });
    }

    /**
     * Subscribe to an specific queue
     * @param callback callback function
     * @param queue queue to subscribe
     * @returns {Promise<void>}
     */

    async subscribeToOneToMany(queueName, callback,) {

        amqp.connect(this.MQServer)
            .then((conn) => {

                logger?.info (` ******   Connected to MQ ${this.MQServer} Queue ${queueName}**********`);
                conn.on('error', (err) => {
                    logger?.log("ERROR: %s", err);
                    conn.close();
                    setTimeout(function () {
                        //self.consume();
                    }, 50000);
                });

                conn.on("closed", () => {
                    logger?.info ("Connection Closed");
                    setTimeout(function () {
                        //self.consume();
                    }, 50000);
                });

                conn.createChannel()
                    .then((ch) => {

                        let ok = ch.assertExchange(queueName, 'fanout', {durable: false})
                            .then(() => {
                                return ch.assertQueue('', {exclusive: true});
                            })
                            .then((qok) => {
                                return ch.bindQueue(qok.queue, queueName, '')
                                    .then(function () {
                                        return qok.queue;
                                    });
                            })
                            .then((queue) => {
                                //ch.prefetch(1);
                                //ch.qos(1);
                                ch.consume(queue, (msg) => {
                                    try {
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
                        callback(JSON.parse(msg.content.toString()))
                            .then(() => {
                                this.readMessageFromQueue(ch, queue, callback);
                            })
                            .catch(e => {
                                setTimeout(() => {
                                    this.readMessageFromQueue(ch, queue, callback)
                                }, 1000);
                                logger.error(ex);
                            })
                        ch.ack(msg);

                    } else {
                        setTimeout(() => {
                            this.readMessageFromQueue(ch, queue, callback)
                        }, 1000);
                    }
                });

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
    async subscribeSingleMessageToQueue(queueName, callback, errfn) {

        amqp.connect(this.MQServer)
            .then((conn) => {

                logger.info(` ******   Connected to MQ ${this.MQServer}  Queue ${queueName} **********`);
                conn.on('error', (err) => {
                    logger?.log("ERROR: %s", err);
                    conn.close();
                    /*setTimeout(function () {
                        //self.consume();
                    }, 50000);*/
                });
                conn.on("closed", () => {
                    logger?.info ("Connection Closed");
                    /*setTimeout(function () {
                        //self.consume();
                    }, 50000);*/
                });

                conn.createChannel()
                    .then((ch) => {

                        let ok = ch.assertExchange(queueName, 'fanout', {durable: false})
                            .then(() => {
                                return ch.assertQueue(queueName, {exclusive: false});
                            })
                            .then((qok) => {
                                return ch.bindQueue(qok.queue, queueName, '')
                                    .then(() => {
                                        return qok.queue;
                                    });
                            })
                            .then((queue) => {
                                this.readMessageFromQueue(ch, queue, callback);
                            });
                    });
            })
            .catch(ex => {
                if (errfn) {
                    errfn(ex);
                }
            })

    }


}


module.exports = MendelMessaging;