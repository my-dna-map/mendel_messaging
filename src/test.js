const MessageQueue = require('./MendelMessaging');

const config = require('../config/local.json');
const queue = new MessageQueue("mendel-bam-process", config);

queue.subscribeToQueue(config.mq.queueName,(message)=>{

  console.log(message);
});
