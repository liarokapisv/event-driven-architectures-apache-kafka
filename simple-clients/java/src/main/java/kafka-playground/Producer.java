package com.ntua.softlab.kafkaplayground;

import static java.lang.System.*;
import java.util.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.*;

public final class Producer 
{
    public static void main( String[] args )
        throws InterruptedException
    {
        final var topic = "test-topic";
        int counter = 0;

        final Map<String,Object> config = 
            Map.of(
                ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, 
                    "localhost:9092",
                ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
                    StringSerializer.class.getName(),
                ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, 
                    StringSerializer.class.getName(),
                ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG,
                    5000,
                ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG,
                    10000,
                ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, 
                    true);

        try (var producer = new KafkaProducer<String, String>(config)) {
            while (true) {
                final var value = new Date().toString();
                final var key = new Integer(counter).toString();
                out.format("Publishing record with key: %s, value: %s%n", key, value);

                try {
                    var metadata = producer.send(new ProducerRecord<>(topic, key, value)).get();
                    out.format("Published with metadata: %s%n", metadata);
                } catch (Exception e) {
                    out.format("Failed with error: %s%n", e);
                }

                ++counter;
                Thread.sleep(1000);
            }
        }
    }
}
