package com.ntua.softlab.kafkaplayground;

import static java.lang.System.*;
import java.time.*;
import java.util.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.*;
import org.apache.kafka.common.errors.WakeupException;


public final class Consumer
{
    public static void main( String[] args )
        throws InterruptedException
    {
        final var topic = "test-topic";

        final Map<String,Object> config = 
            Map.of(
                ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, 
                    "localhost:9092",
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
                    StringDeserializer.class.getName(),
                ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, 
                    StringDeserializer.class.getName(),
                ConsumerConfig.GROUP_ID_CONFIG,
                    "basic-consumer-sample",
                ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, 
                    "earliest",
                ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,
                    false);

        var consumer = new KafkaConsumer<String, String>(config);

        final Thread mainThread = Thread.currentThread();

        Runtime.getRuntime().addShutdownHook(new Thread() {
            public void run() {
                System.out.println("Starting exit...");
                consumer.wakeup();
                try {
                    mainThread.join();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        });

        try {
            consumer.subscribe(Set.of(topic));

            while (true) {
                final var records = consumer.poll(Duration.ofMillis(100));
                for (var record : records) {
                    out.format("Got record with value: %s%n", record.value());
                }
                consumer.commitSync();
            }
        }
        catch (WakeupException e)
        {
            // ignore
        } 
        finally {
            consumer.close();
            System.out.println("Closed consumer.");
        }
    }
}
