// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0

use aptos_metrics_core::{
    register_int_counter, register_int_counter_vec, IntCounter, IntCounterVec, IntGaugeVec, register_int_gauge_vec,
};
use once_cell::sync::Lazy;

/// Number of times a given substream has been invoked
pub static SUBSTREAM_INVOCATIONS: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "indexer_substream_invocation_count",
        "Number of times a given substream has been invoked",
        &["substream_name"]
    )
    .unwrap()
});

/// Number of times any given substream has raised an error
pub static SUBSTREAM_ERRORS: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "indexer_substream_error_count",
        "Number of times any given substream has raised an error",
        &["substream_name"]
    )
    .unwrap()
});

/// Number of times any given substream has completed successfully
pub static SUBSTREAM_SUCCESSES: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "indexer_substream_success_count",
        "Number of times a given substream has completed successfully",
        &["substream_name"]
    )
    .unwrap()
});

/// Number of times the connection pool has timed out when trying to get a connection
pub static UNABLE_TO_GET_CONNECTION: Lazy<IntCounter> = Lazy::new(|| {
    register_int_counter!(
        "indexer_connection_pool_err",
        "Number of times the connection pool has timed out when trying to get a connection"
    )
    .unwrap()
});

/// Number of times the connection pool got a connection
pub static GOT_CONNECTION: Lazy<IntCounter> = Lazy::new(|| {
    register_int_counter!(
        "indexer_connection_pool_ok",
        "Number of times the connection pool got a connection"
    )
    .unwrap()
});

/// Max block processed
pub static LATEST_PROCESSED_BLOCK: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "indexer_substream_latest_block",
        "Latest block a substream has fully consumed",
        &["substream_name"]
    )
    .unwrap()
});
