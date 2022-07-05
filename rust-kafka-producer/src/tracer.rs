use opentelemetry::global;
use opentelemetry::sdk;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_semantic_conventions as semconv;
use tonic::metadata::MetadataMap;
use tonic::transport::ClientTlsConfig;
use tracing_subscriber::layer::SubscriberExt;

pub fn install_subscriber() -> Result<(), Box<dyn std::error::Error>> {
    let meta = {
        let mut meta = MetadataMap::with_capacity(2);

        meta.insert(
            "x-honeycomb-team",
            "0a38c3699d1057d5957b42f3536eb0d7".parse().unwrap(),
        );

        meta.insert(
            "x-honeycomb-dataset",
            "example-rust-dataset".parse().unwrap(),
        );

        meta
    };

    let otlp_exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("https://api.honeycomb.io:443")
        .with_metadata(meta)
        .with_tls_config(ClientTlsConfig::new().domain_name("api.honeycomb.io"));

    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_trace_config(sdk::trace::config().with_resource(sdk::Resource::new(vec![
            semconv::resource::SERVICE_NAME.string("producer"),
            semconv::resource::SERVICE_NAMESPACE.string("kafka"),
        ])))
        .with_exporter(otlp_exporter)
        .install_batch(opentelemetry::runtime::Tokio)
        .expect("Failed to install otlp tracer");

    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    let subscriber = tracing_subscriber::Registry::default().with(telemetry);

    tracing::subscriber::set_global_default(subscriber)?;

    global::set_text_map_propagator(sdk::propagation::TraceContextPropagator::new());

    Ok(())
}
