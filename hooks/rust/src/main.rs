//! Rust port of the slim-claude hooks. One binary, one subcommand per hook:
//! guard-destructive | guard-secrets | check-json | council-nudge | session-start
//! Mirrors hooks/*.mjs behavior; run `node hooks/test.mjs --rust` to check parity.
//! Like the Node hooks, any unreadable input exits 0 silently so a hook never blocks work.

use regex::Regex;
use serde_json::{json, Value};
use std::io::Read;
use std::path::Path;
use std::{env, fs};

fn input() -> Value {
    let mut s = String::new();
    let _ = std::io::stdin().read_to_string(&mut s);
    serde_json::from_str(&s).unwrap_or(Value::Null)
}

fn re(p: &str) -> Regex {
    Regex::new(p).expect("static regex")
}

fn str_at<'a>(v: &'a Value, path: &[&str]) -> &'a str {
    let mut cur = v;
    for k in path {
        cur = &cur[*k];
    }
    cur.as_str().unwrap_or("")
}

fn ask(event: &str, reason: String) {
    println!(
        "{}",
        json!({"hookSpecificOutput": {
            "hookEventName": event,
            "permissionDecision": "ask",
            "permissionDecisionReason": reason
        }})
    );
}

fn guard_destructive(v: &Value) {
    let cmd = str_at(v, &["tool_input", "command"]);
    let rules = [
        (r"\bgit\s+push\b[^|;&]*(--force\b|--force-with-lease\b|\s-f\b)", "force-push rewrites remote history"),
        (r"\bgit\s+reset\s+--hard\b", "git reset --hard discards uncommitted work"),
        (r"\bgit\s+clean\b[^|;&]*\s-[a-z]*f", "git clean -f deletes untracked files"),
        (r"\bgit\s+worktree\s+remove\b", "removes a worktree"),
        (r"\borca\s+worktree\s+rm\b", "removes an Orca worktree"),
        (r"\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b", "recursive force delete"),
    ];
    if let Some((_, why)) = rules.iter().find(|(p, _)| re(p).is_match(cmd)) {
        ask("PreToolUse", format!("slim-claude guard: {why}. Confirm before running."));
    }
}

fn guard_secrets(v: &Value) {
    let ti = &v["tool_input"];
    let file = ti["file_path"].as_str().unwrap_or("");
    let mut parts: Vec<&str> = vec![];
    for s in [&ti["content"], &ti["new_string"]] {
        if let Some(t) = s.as_str() {
            parts.push(t);
        }
    }
    if let Some(edits) = ti["edits"].as_array() {
        parts.extend(edits.iter().filter_map(|e| e["new_string"].as_str()));
    }
    let text = parts.join("\n");

    let base = file.rsplit(['/', '\\']).next().unwrap_or("");
    let lower = base.to_lowercase();
    let env_file = lower == ".env"
        || (lower.starts_with(".env.")
            && !["example", "sample", "template"].iter().any(|s| lower[5..].starts_with(s)));
    let key_file = lower == "id_rsa"
        || lower == "id_ed25519"
        || [".pem", ".key", ".p12", ".pfx"].iter().any(|e| lower.len() > e.len() && lower.ends_with(e));

    let reason = if env_file || key_file {
        format!("writes to a secret-bearing file ({base})")
    } else {
        let pats = [
            (r"AKIA[0-9A-Z]{16}", "AWS access key id"),
            (r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----", "private key block"),
            (r"\bgh[pousr]_[A-Za-z0-9]{36,}\b", "GitHub token"),
            (r"\bsk-ant-[A-Za-z0-9_-]{20,}", "Anthropic API key"),
            (r"\bsk-[A-Za-z0-9]{32,}\b", "API secret key"),
            (r"\bxox[baprs]-[A-Za-z0-9-]{10,}", "Slack token"),
        ];
        match pats.iter().find(|(p, _)| re(p).is_match(&text)) {
            Some((_, what)) => format!("content looks like a {what}"),
            None => return,
        }
    };
    ask("PreToolUse", format!("slim-claude guard: {reason}. Confirm before writing."));
}

fn check_json(v: &Value) {
    let file = str_at(v, &["tool_input", "file_path"]);
    if !file.to_lowercase().ends_with(".json") || !Path::new(file).exists() {
        return;
    }
    // Same policy as check-json.mjs: skip files over 5 MiB and unreadable files; only a real parse error blocks.
    if fs::metadata(file).map(|m| m.len() > 5 * 1024 * 1024).unwrap_or(true) {
        return;
    }
    let Ok(text) = fs::read_to_string(file) else { return };
    if let Err(e) = serde_json::from_str::<Value>(&text) {
        println!(
            "{}",
            json!({"decision": "block", "reason": format!("{file} is not valid JSON after your edit: {e}. Fix it before continuing.")})
        );
    }
}

fn council_nudge(v: &Value) {
    let trigger = re(r"(?i)\b(?:councillors?|councils?|consensus|second opinions?|roundtable|multiple opinions|multiple models|several models|multi-?model|multi-?agents?|panel|deliberat\w*|diverse perspectives|sounding board|konsensus|pendapat kedua|beberapa model|banyak model|dewan)\b");
    let prompt = v["prompt"].as_str().unwrap_or("");
    let text = re(r"```(?s:.*?)```").replace_all(prompt, " ");
    let text = re(r"`[^`\n]*`").replace_all(&text, " ");
    if re(r"(?i)^\s*/[a-z][\w:-]*(\s|$)").is_match(&text) || !trigger.is_match(&text) {
        return;
    }
    let sid: String = v["session_id"]
        .as_str()
        .unwrap_or("")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    if !sid.is_empty() {
        let marker = env::temp_dir().join(format!("slim-claude-council-{sid}"));
        if marker.exists() {
            return;
        }
        let _ = fs::write(&marker, "");
    }
    println!(
        "{}",
        json!({"hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": "If this request calls for multi-model consensus, run the council skill (/slim-claude:council). Ignore this note if the word was incidental."
        }})
    );
}

fn session_start(v: &Value) {
    let cwd = v["cwd"]
        .as_str()
        .map(String::from)
        .or_else(|| env::current_dir().ok().map(|p| p.to_string_lossy().into_owned()))
        .unwrap_or_default();
    let root = Path::new(&cwd).join(".slim-claude");
    let mut notes: Vec<String> = vec![];
    if root.join("codemap.json").exists() {
        notes.push("This repo has a codemap (.slim-claude/codemap.json). Read the nearest codemap.md before exploring unfamiliar folders; run the codemap skill to refresh it after large changes.".into());
    }
    let done = re(r"(?i)status:\s*completed");
    if let Ok(dir) = fs::read_dir(root.join("deepwork")) {
        for slug in dir.flatten().filter(|d| d.path().is_dir()) {
            let name = slug.file_name().to_string_lossy().into_owned();
            let Ok(text) = fs::read_to_string(slug.path().join("progress.md")) else { continue };
            if !done.is_match(text.lines().next().unwrap_or("")) {
                notes.push(format!("Deepwork task \"{name}\" looks active. If this session continues it, load the deepwork skill and read .slim-claude/deepwork/{name}/progress.md before anything else."));
            }
        }
    }
    if !notes.is_empty() {
        println!(
            "{}",
            json!({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": notes.join("\n")}})
        );
    }
}

fn main() {
    let v = input();
    match env::args().nth(1).as_deref() {
        Some("guard-destructive") => guard_destructive(&v),
        Some("guard-secrets") => guard_secrets(&v),
        Some("check-json") => check_json(&v),
        Some("council-nudge") => council_nudge(&v),
        Some("session-start") => session_start(&v),
        _ => {}
    }
}
