use rdkafka::message::BorrowedHeaders;
use rdkafka::message::Headers;
use rdkafka::message::OwnedHeaders;

use opentelemetry::propagation::{Extractor, Injector};

pub struct HeaderInjector<'a>(pub &'a mut OwnedHeaders);
pub struct HeaderExtractor<'a>(pub &'a BorrowedHeaders);

impl<'a> Injector for HeaderInjector<'a> {
    fn set(&mut self, key: &str, value: String) {
        self.0
            .clone_from(&self.0.clone().add(key, value.as_str()));
    }
}

impl<'a> Extractor for HeaderExtractor<'a> {
    fn get(&self, key: &str) -> Option<&str> {
        for i in 0..self.0.count() {
            let (k, value) = self.0.get(i)?;
            if k == key  {
                return std::str::from_utf8(&value).ok();
            }
        }
        None
    }

    fn keys(&self) -> Vec<&str> {
        (0..self.0.count())
            .filter_map(|i| Some(self.0.get(i)?.0))
            .collect()
    }
}
