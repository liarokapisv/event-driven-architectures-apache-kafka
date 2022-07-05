use opentelemetry::global;
use opentelemetry::trace::SpanKind;
use rdkafka::error::KafkaError;
use rdkafka::message::{OwnedHeaders, OwnedMessage};
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::boxed::Box;
use tracing_opentelemetry::OpenTelemetrySpanExt;

mod config;
mod propagator;
mod tracer;

use propagator::HeaderInjector;

fn log_produce_result(topic: &str, key: &str, result: Result<(i32, i64), (KafkaError, OwnedMessage)>) {
    match result {
        Ok((p, o)) => println!(
            "Successfully produced record to topic {} partition [{}] @ key {} - offset {}",
            topic, p, key, o
        ),
        Err((err, _)) => eprintln!("kafka error: {}", err),
    }
}

#[tracing::instrument(
    skip(
        producer
    ),
    fields(
        otel.kind = %SpanKind::Producer,
        messaging.system = %"kafka",
        messaging.destination_kind = %"topic",
        messaging.destination = %dataset,
        messaging.temp_destination = %false
    )
)]
async fn send_msg(producer: &mut FutureProducer, dataset: &str, msg: i32) {
    let mut headers = OwnedHeaders::new();

    global::get_text_map_propagator(|propagator| {
        let context = tracing::Span::current().context();
        propagator.inject_context(&context, &mut HeaderInjector(&mut headers));
    });

    let value = msg.to_string();

    let topic = "datasets";

    let future = FutureRecord::to(topic)
        .payload(value.as_bytes())
        .key(dataset)
        .headers(headers);

    let res = producer.send(future, core::time::Duration::default()).await;

    log_produce_result(topic, dataset, res);
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let (dataset, config) = config::get_config()?;

    tracer::install_subscriber()?;

    let mut producer: FutureProducer = config.create()?;

    for msg in 0..8 as i32 {
        send_msg(&mut producer, &dataset, msg).await;
    }

    global::shutdown_tracer_provider();

    !Ok(())
}
