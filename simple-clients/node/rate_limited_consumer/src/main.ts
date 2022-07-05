import { KafkaConsumer, ConsumerGlobalConfig, ConsumerTopicConfig, Message } from 'node-rdkafka'
import { program, Option, InvalidArgumentError }  from 'commander';

import { z } from 'zod';

function wrapZod(parser, conv ?) {
  return (s : string) => {

    const wrapper = conv ? 
            p => z.preprocess(x => { if (typeof x == 'string') return conv(x) }, p) :
            p => p;

    const r = wrapper(parser).safeParse(s);

    if (r.success)
    {
      return r.data;
    }
    else
    {
      const errors = r.error.issues.map(i => i.message).join('');
      throw new InvalidArgumentError(errors);
    }
  };
}

function commaSeparatedUrls(s) {
    const a = s.split(',')
    return a.map(wrapZod(z.string().url()))
}

function nonNegativeFloat(s) {
    return wrapZod(z.number().nonnegative(), parseFloat)(s);
}

program
    .name("rate limited consumer")
    .description("kafka consumer that can specify it's consumption rate.")
    .addOption(
        new Option("-b, --bootstrap-servers <urls...>", "list of bootstrap servers")
            .argParser(commaSeparatedUrls)
            .makeOptionMandatory()
            .env("RATE_LIMITED_CONSUMER__BOOTSTRAP_SERVERS"))
    .addOption(
        new Option("-g, --group-id <id>", "consumer's consumer group id")
            .makeOptionMandatory()
            .env("RATE_LIMITED_CONSUMER__GROUP_ID"))
    .addOption(
        new Option("-t, --topic <topic>", "topic to read from")
            .makeOptionMandatory()
            .env("RATE_LIMITED_CONSUMER__TOPIC"))
    .addOption(
        new Option("-r, --rate <secs>", "message consumption rate")
            .argParser(nonNegativeFloat)
            .default(1.0)
            .env("RATE_LIMITED_CONSUMER__RATE"));

program.parse(process.argv)

const opts = program.opts();

console.log(`rate: ${opts.rate}`);
console.log(`servers: ${opts.bootstrapServers}`);

var consumer = new KafkaConsumer(
    {
        'bootstrap.servers' : opts.bootstrapServers,
        'group.id' : opts.groupId,
        'enable.auto.commit' : false,
    },
    {}
);

consumer.on('event.log', log => {
  console.log('Log: ', log.message);
});

consumer.on('event.error', err => {
  console.error('Error: ', err)
});

consumer.on('ready', arg => {
  console.log('consumer ready.' + JSON.stringify(arg));

  consumer.subscribe([opts.topic])
  setInterval(() => {
    consumer.consume(1);
  }, 1000 / opts.rate);
});

consumer.on('data', (msg : Message) => {
    if (msg.value)
        console.log(`partition - ${msg.partition}, offset - ${msg.offset}, value - ${msg.value.toString()}`);
    consumer.commit();
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
