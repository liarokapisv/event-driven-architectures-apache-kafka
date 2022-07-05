use rdkafka::config::ClientConfig;
use std::boxed::Box;
use std::fs::File;
use std::io::BufRead;
use std::io::BufReader;
use std::path::PathBuf;
use structopt::StructOpt;

#[derive(StructOpt)]
#[structopt(name = "rust client example")]
struct Opt {
    /// path to confluent cloud config file
    #[structopt(long, parse(from_os_str))]
    config: PathBuf,

    /// dataset to send
    #[structopt(long)]
    dataset: String,
}

pub fn get_config() -> Result<(String, ClientConfig), Box<dyn std::error::Error>> {
    let opt = Opt::from_args();

    let mut kafka_config = ClientConfig::new();

    let file = File::open(opt.config)?;
    for line in BufReader::new(&file).lines() {
        let cur_line: String = line?.trim().to_string();
        if cur_line.starts_with('#') || cur_line.len() < 1 {
            continue;
        }
        let key_value: Vec<&str> = cur_line.split("=").collect();
        kafka_config.set(
            key_value.get(0).ok_or("malformed key")?.to_string(),
            key_value.get(1).ok_or("malformed value")?.to_string(),
        );
    }

    Ok((opt.dataset, kafka_config))
}
