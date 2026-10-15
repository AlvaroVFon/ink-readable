//go:build !linux

package main

// armParentDeathSignal is a no-op outside Linux: the shell kills the sidecar on
// a clean exit (see api::shutdown in the Rust shell), and there is no portable
// equivalent of PR_SET_PDEATHSIG.
func armParentDeathSignal() {}
