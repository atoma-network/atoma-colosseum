use std::{path::Path, str::FromStr, time::Duration};

use clap::Parser;
use dotenv::dotenv;
use guess_ai::{
    atoma::AtomaSdk,
    client::SuiClientContext,
    config::GuessAiConfig,
    engine::{GuessAiEngine, GuessAiEngineError, Result},
};
use sui_sdk::{types::base_types::ObjectID, wallet_context::WalletContext};
use tracing_subscriber::EnvFilter;

/// Command line arguments for the Guess AI
#[derive(Parser)]
struct Args {
    /// Path to the configuration file
    #[arg(short, long)]
    config_path: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let args = Args::parse();
    let config = GuessAiConfig::from_file_path(&args.config_path);

    let atoma_sdk = AtomaSdk::new(
        std::env::var("ATOMA_API_KEY").unwrap(),
        std::env::var("ATOMA_MODEL").unwrap(),
    );
    let guess_ai_db = ObjectID::from_str(&config.guess_ai_db).unwrap();
    let guess_ai_package_id = ObjectID::from_str(&config.guess_ai_package_id).unwrap();
    let config_path = Path::new(&args.config_path);
    let request_timeout = config.request_timeout.map(|t| Duration::from_secs(t));
    let max_concurrent_requests = config.max_concurrent_requests.map(|t| t as u64);
    let wallet_context = WalletContext::new(config_path, request_timeout, max_concurrent_requests)?;
    let sui_client_ctx = SuiClientContext::new(guess_ai_db, guess_ai_package_id, wallet_context);
    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);
    let engine = GuessAiEngine::new(atoma_sdk, config, sui_client_ctx, shutdown_rx).await?;
    let join_handle = tokio::spawn(async move {
        engine.run().await?;
        Ok::<(), GuessAiEngineError>(())
    });
    Ok(())
}
