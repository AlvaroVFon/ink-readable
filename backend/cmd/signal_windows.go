//go:build windows

package main

import "os"

// interruptSignals are the signals that trigger a graceful shutdown on
// Windows. The desktop shell terminates the process through the OS, which the
// Go runtime surfaces as an interrupt.
func interruptSignals() []os.Signal {
	return []os.Signal{os.Interrupt}
}
