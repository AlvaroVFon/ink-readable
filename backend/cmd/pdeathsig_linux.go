//go:build linux

package main

import (
	"log"
	"os"

	"golang.org/x/sys/unix"
)

// armParentDeathSignal asks the kernel to deliver SIGTERM when the parent
// process (the Tauri shell) dies. Without it a shell crash — for example the
// WebKitGTK Wayland abort — leaves this sidecar listening with no window
// attached. SIGTERM is already a graceful-shutdown signal (see
// interruptSignals), so the normal drain path runs.
func armParentDeathSignal() {
	if err := unix.Prctl(unix.PR_SET_PDEATHSIG, uintptr(unix.SIGTERM), 0, 0, 0); err != nil {
		log.Printf("arm parent death signal: %v", err)
		return
	}

	// If the parent exited before the signal was armed, the kernel re-parents
	// us to init (PID 1) and the signal never fires; don't linger.
	if os.Getppid() == 1 {
		log.Print("parent process is gone, exiting")
		os.Exit(0)
	}
}
