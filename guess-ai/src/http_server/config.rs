use std::path::Path;

use config::{Config, File};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct HttpServerConfig {
    /// Bind address for the Http Server.
    ///
    /// This field specifies the address and port on which the Atoma Proxy Server will bind.
    pub service_bind_address: String,
}

impl HttpServerConfig {
    /// Creates a new `HttpServerConfig` instance from a configuration file.
    ///
    /// # Arguments
    ///
    /// * `config_file_path` - Path to the configuration file. The file should be in a format
    ///   supported by the `config` crate (e.g., YAML, JSON, TOML) and contain an "http_server"
    ///   section with the required configuration fields.
    ///
    /// # Returns
    ///
    /// Returns a new `HttpServerConfig` instance populated with values from the config file.
    ///
    /// # Panics
    ///
    /// This method will panic if:
    /// * The configuration file cannot be read or parsed
    /// * The "http_service" section is missing from the configuration
    /// * The configuration format doesn't match the expected structure
    pub fn from_file_path<P: AsRef<Path>>(config_file_path: P) -> Self {
        let builder = Config::builder()
            .add_source(File::with_name(config_file_path.as_ref().to_str().unwrap()))
            .add_source(
                config::Environment::with_prefix("HTTP_SERVER")
                    .keep_prefix(true)
                    .separator("__"),
            );
        let config = builder
            .build()
            .expect("Failed to generate atoma-service configuration file");
        config
            .get::<Self>("http_server")
            .expect("Failed to generate configuration instance")
    }
}
