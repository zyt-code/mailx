use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProviderServerConfig {
    pub server: String,
    pub port: u16,
    pub use_ssl: bool,
}

#[derive(Debug, Deserialize)]
struct ProviderDefaultsDoc {
    imap: HashMap<String, ProviderServerConfig>,
    smtp: HashMap<String, ProviderServerConfig>,
}

static PROVIDER_DEFAULTS: Lazy<ProviderDefaultsDoc> = Lazy::new(|| {
    const RAW: &str = include_str!("../../src/lib/config/provider-defaults.json");
    serde_json::from_str(RAW).expect("provider-defaults.json must be valid JSON")
});

pub fn imap_for_domain(domain: &str) -> Option<ProviderServerConfig> {
    PROVIDER_DEFAULTS.imap.get(&domain.to_lowercase()).cloned()
}

pub fn smtp_for_domain(domain: &str) -> Option<ProviderServerConfig> {
    PROVIDER_DEFAULTS.smtp.get(&domain.to_lowercase()).cloned()
}

#[allow(dead_code)]
pub fn imap_for_email(email: &str) -> Option<ProviderServerConfig> {
    domain_from_email(email).and_then(|domain| imap_for_domain(&domain))
}

#[allow(dead_code)]
pub fn smtp_for_email(email: &str) -> Option<ProviderServerConfig> {
    domain_from_email(email).and_then(|domain| smtp_for_domain(&domain))
}

#[allow(dead_code)]
fn domain_from_email(email: &str) -> Option<String> {
    email.split('@').nth(1).map(|d| d.to_lowercase())
}
