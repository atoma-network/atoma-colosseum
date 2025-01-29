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
use tokio::task::JoinHandle;
use tracing::{error, info, instrument};
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

    let atoma_sdk = AtomaSdk::new(config.atoma_api_key.clone(), config.model.clone());
    let guess_ai_db = ObjectID::from_str(&config.guess_ai_db).unwrap();
    let guess_ai_package_id = ObjectID::from_str(&config.guess_ai_package_id).unwrap();
    let request_timeout = config.request_timeout.map(|t| Duration::from_secs(t));
    let max_concurrent_requests = config.max_concurrent_requests.map(|t| t as u64);
    let wallet_context = WalletContext::new(
        Path::new(&config.sui_config_path),
        request_timeout,
        max_concurrent_requests,
    )?;
    let sui_client_ctx = SuiClientContext::new(guess_ai_db, guess_ai_package_id, wallet_context);
    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);
    let engine = GuessAiEngine::new(atoma_sdk, config, sui_client_ctx, shutdown_rx.clone()).await?;

    let ctrl_c = trigger_shutdown_on_ctrl_c(shutdown_tx.clone(), shutdown_rx);

    let join_handle = spawn_with_shutdown(engine.run(), shutdown_tx);

    let (guess_ai_result, ctrl_c_result) = tokio::try_join!(join_handle, ctrl_c)?;
    handle_tasks_results(guess_ai_result, ctrl_c_result)?;

    info!(
        target = "guess-ai-service",
        event = "guess-ai-stop",
        message = "Guess AI service shut down successfully"
    );

    Ok(())
}

/// Spawns a task that will automatically trigger shutdown if it encounters an error
///
/// This helper function wraps a future in a tokio task that monitors its execution.
/// If the wrapped future returns an error, it will automatically trigger a shutdown
/// signal through the provided sender.
///
/// # Arguments
///
/// * `f` - The future to execute, which must return a `Result<()>`
/// * `shutdown_sender` - A channel sender used to signal shutdown to other parts of the application
///
/// # Returns
///
/// Returns a `JoinHandle` for the spawned task
///
/// # Example
///
/// ```rust,ignore
/// let (shutdown_tx, shutdown_rx) = watch::channel(false);
/// let handle = spawn_with_shutdown(some_fallible_task(), shutdown_tx);
/// ```
pub fn spawn_with_shutdown<F>(
    f: F,
    shutdown_sender: tokio::sync::watch::Sender<bool>,
) -> tokio::task::JoinHandle<Result<()>>
where
    F: std::future::Future<Output = Result<()>> + Send + 'static,
{
    tokio::task::spawn(async move {
        let res = f.await;
        if res.is_err() {
            // Only send shutdown signal if the task failed
            shutdown_sender
                .send(true)
                .map_err(|e| GuessAiEngineError::InternalError(e.to_string()))?;
        }
        res.map_err(Into::into)
    })
}

#[instrument(
    level = "info",
    skip_all,
    fields(
        event = "guess-ai-stop",
        message = "ctrl-c received, sending shutdown signal"
    )
)]
fn trigger_shutdown_on_ctrl_c(
    shutdown_tx: tokio::sync::watch::Sender<bool>,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) -> JoinHandle<Result<()>> {
    tokio::task::spawn(async move {
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {
                info!(
                    target = "guess-ai-service",
                    event = "guess-ai-stop",
                    "ctrl-c received, sending shutdown signal"
                );
                shutdown_tx
                    .send(true)?;
                Ok::<(), GuessAiEngineError>(())
            }
            _ = shutdown_rx.changed() => {
                Ok::<(), GuessAiEngineError>(())
            }
        }
    })
}

#[instrument(
    level = "info",
    skip_all,
    fields(event = "guess-ai-stop", message = "guess-ai-stop")
)]
fn handle_tasks_results(guess_ai_result: Result<()>, ctrl_c_result: Result<()>) -> Result<()> {
    let result_handler = |result: Result<()>, message: &str| {
        if let Err(e) = result {
            error!(
                target = "atoma-node-service",
                event = "atoma_node_service_shutdown",
                error = ?e,
                "{message}"
            );
            return Err(e);
        }
        Ok(())
    };
    result_handler(guess_ai_result, "Guess AI terminated abruptly")?;
    result_handler(ctrl_c_result, "Ctrl-C received")?;
    Ok(())
}
