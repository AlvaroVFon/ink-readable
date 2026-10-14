//go:build !windows

package main

import (
	"os"
	"syscall"
)

// interruptSignals are the signals that trigger a graceful shutdown on
// non-Windows platforms: Ctrl-C and the SIGTERM sent by the desktop shell.
func interruptSignals() []os.Signal {
	return []os.Signal{os.Interrupt, syscall.SIGTERM}
}
