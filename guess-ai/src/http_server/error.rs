use thiserror::Error;

/// Error type for the HTTP Server.
#[derive(Error, Debug)]
pub enum HttpServerError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
