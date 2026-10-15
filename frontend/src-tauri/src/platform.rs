//! Startup workarounds for platform quirks.
//!
//! Some Wayland setups make WebKitGTK abort before the window is shown
//! (`Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display`),
//! and some GPUs then fail to paint under XWayland (`Failed to create GBM
//! buffer of size …: Invalid argument`), leaving a blank window. Forcing
//! XWayland plus the non-DMA-BUF renderer is the combination that works on the
//! affected machines; it is applied unless the user overrides it.

/// Environment overrides applied on Linux before GTK/WebKit initialize.
#[cfg(target_os = "linux")]
fn graphics_workarounds() -> [(&'static str, &'static str); 2] {
    [
        ("GDK_BACKEND", "x11"),
        ("WEBKIT_DISABLE_DMABUF_RENDERER", "1"),
    ]
}

/// Sets the Linux graphics workarounds in the process environment, leaving any
/// variable the user already set untouched so an explicit override always wins.
/// No-op on other platforms. Must run before the Tauri app (GTK) is built.
pub fn apply_graphics_workarounds() {
    #[cfg(target_os = "linux")]
    for (key, value) in graphics_workarounds() {
        if std::env::var_os(key).is_none() {
            std::env::set_var(key, value);
        }
    }
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;

    #[test]
    fn forces_xwayland_and_the_fallback_renderer() {
        let vars = graphics_workarounds();
        assert!(vars.contains(&("GDK_BACKEND", "x11")));
        assert!(vars.contains(&("WEBKIT_DISABLE_DMABUF_RENDERER", "1")));
    }
}
