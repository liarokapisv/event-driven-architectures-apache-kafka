import { KafkaConsumer, ConsumerGlobalConfig, ConsumerTopicConfig, Message } from 'node-rdkafka'
import io from 'socket.io-client';
import { program, Option }  from 'commander';
import { v4 as uuidv4 } from 'uuid';

program
    .name("kafka-socket.io-bridge")
    .description("bridge between a kafka topic and a socket.io server.")
    .addOption(
        new Option("-b, --kafka-bootstrap-servers <urls...>", 
                   "initial list of kafka servers used to initiate the connection with the kafka cluster")
            .makeOptionMandatory()
            .env("EMIEWEB__KAFKA_SOCKETIO_BRIDGE__KAFKA__BOOTSTRAP_SERVERS"))
    .addOption(
        new Option("-t, --kafka-topic <topic>", 
                   "kafka topic to bridge to the socket.io layer")
            .makeOptionMandatory()
            .env("EMIEWEB__KAFKA_SOCKETIO_BRIDGE__KAFKA__TOPIC"))
    .addOption(
        new Option("-g, --kafka-group-id <id>", 
                   "the id for the consumer group that the consumer instance belongs to - defaults to unique")
            .env("EMIEWEB__KAFKA_SOCKETIO_BRIDGE__KAFKA__GROUP_ID"))
    .addOption(
        new Option("-t, --kafka-poll-timeout <sec>", 
                   "the timeout value in seconds used for the internal poll method")
            .default("1.0")
            .argParser(parseFloat)
            .env("EMIEWEB__KAFKA_SOCKETIO_BRIDGE__KAFKA__POLL_TIMEOUT"))
    .addOption(
        new Option("-t, --socketio-server <url>", 
                   "the socket.io server to bridge to")
            .makeOptionMandatory()
            .env("EMIEWEB__KAFKA_SOCKETIO_BRIDGE__SOCKETIO__SERVER"))
    .addOption(
        new Option("-t, --socketio-message-tag <tag>", 
                   "the message tag used when sending the data to the socket.io server")
            .makeOptionMandatory()
            .env("EMIEWEB__KAFKA_SOCKETIO_BRIDGE__SOCKETIO__MESSAGE_TAG"))

program.parse(process.argv)

const conf = (() => {
    let conf = program.opts();
    conf.kafkaGroupId = conf.kafkaGroupId ? conf.kafkaGroupId : uuidv4();
    return conf
})();

console.log("-----------------")
console.log(" kafka-bootstrap-servers: ", conf.kafkaBootstrapServers)
console.log(" kafka-topic: ", conf.kafkaTopic)
console.log(" kafka-group-id: ", conf.kafkaGroupId)
console.log(" kafka-poll-timeout: ", conf.kafkaPollTimeout)
console.log(" socketio-server: ", conf.socketioServer)
console.log(" socketio-message-tag: ", conf.socketioMessageTag)
console.log("-----------------")

var consumer = new KafkaConsumer(
    {
        'bootstrap.servers' : conf.kafkaBootstrapServers,
        'group.id' : conf.kafkaGroupId,
        'enable.auto.commit' : false
    },
    {}
);

const socket = io(conf.socketioServer)

consumer.on('event.log', log => {
  console.log(log);
});

consumer.on('event.error', err => {
  console.error('Error from consumer');
  console.error(err);
});

consumer.on('ready', arg => {
  console.log('consumer ready.' + JSON.stringify(arg));

  consumer.subscribe([conf.kafkaTopic])
  consumer.consume();
});

consumer.on('data', (msg : Message) => {
    console.log(msg);
    const rep = msg?.value?.toString("utf8");
    try {
        if (rep !== null && rep !== undefined) {
            const json = JSON.parse(rep)
            socket.emit(conf.socketioMessageTag, json);
            console.log(json);
            consumer.commit();
        }
    } catch (err) {
        console.error(err);
    }
});

const errorTypes = ['unhandledRejection', 'uncaughtException']
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

errorTypes.map(type => {
  process.on(type, async e => {
    try {
      console.log(`process.on ${type}`)
      console.error(e)
      await consumer.disconnect()
      process.exit(0)
    } catch (_) {
      process.exit(1)
    }
  })
})

signalTraps.map(type => {
  process.once(type, async () => {
    try {
      await consumer.disconnect()
    } finally {
      process.kill(process.pid, type)
    }
  })
})

consumer.connect();
