package main

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

var (
	buildOnce  sync.Once
	binaryPath string
	buildErr   error
)

// buildBinary compiles the CLI once per test run and returns its path.
func buildBinary(t *testing.T) string {
	t.Helper()

	buildOnce.Do(func() {
		backendDir, err := filepath.Abs("..")
		if err != nil {
			buildErr = err
			return
		}

		dir, err := os.MkdirTemp("", "ink-readable-build-")
		if err != nil {
			buildErr = err
			return
		}

		path := filepath.Join(dir, "ink-readable-api")
		build := exec.Command("go", "build", "-o", path, "./cmd")
		build.Dir = backendDir
		if out, err := build.CombinedOutput(); err != nil {
			buildErr = fmt.Errorf("build binary: %w\n%s", err, out)
			return
		}

		binaryPath = path
	})

	if buildErr != nil {
		t.Fatalf("%v", buildErr)
	}

	return binaryPath
}

// startDesktop launches the binary in desktop mode and returns the base URL
// once the process printed its ready line. The process is killed on cleanup.
func startDesktop(t *testing.T, dataDir string) (string, *exec.Cmd) {
	t.Helper()

	cmd := exec.Command(buildBinary(t), "--desktop", "--port", "0", "--data-dir", dataDir)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("stdout pipe: %v", err)
	}
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		t.Fatalf("start binary: %v", err)
	}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	})

	return waitForReady(t, stdout), cmd
}

// TestDesktopModeServesAPI exercises the desktop contract end to end: flags,
// embedded migrations, the stdout ready line and the HTTP API on a loopback
// port chosen by the OS.
func TestDesktopModeServesAPI(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping desktop end-to-end test in -short mode")
	}

	dataDir := filepath.Join(t.TempDir(), "data")
	baseURL, _ := startDesktop(t, dataDir)

	assertStatus(t, baseURL+"/health", http.StatusOK)
	assertStatus(t, baseURL+"/api/v1/vaults", http.StatusOK)

	if _, err := os.Stat(filepath.Join(dataDir, "ink-readable.db")); err != nil {
		t.Errorf("expected the database file in the data dir: %v", err)
	}
}

func TestDesktopModeRequiresDataDir(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping desktop end-to-end test in -short mode")
	}

	out, err := exec.Command(buildBinary(t), "--desktop").CombinedOutput()
	if err == nil {
		t.Fatalf("expected a non-zero exit without --data-dir, output:\n%s", out)
	}
	if !strings.Contains(string(out), "--data-dir") {
		t.Errorf("expected the error to mention --data-dir, got:\n%s", out)
	}
}

func waitForReady(t *testing.T, stdout io.Reader) string {
	t.Helper()

	type result struct {
		url string
		err error
	}
	ready := make(chan result, 1)

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			if rest, ok := strings.CutPrefix(line, readyToken); ok {
				ready <- result{url: strings.TrimSpace(rest)}
				return
			}
		}
		ready <- result{err: io.EOF}
	}()

	select {
	case r := <-ready:
		if r.err != nil {
			t.Fatalf("backend exited before signalling ready: %v", r.err)
		}
		return r.url
	case <-time.After(30 * time.Second):
		t.Fatal("timed out waiting for the ready line")
		return ""
	}
}

func assertStatus(t *testing.T, url string, want int) {
	t.Helper()

	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != want {
		t.Errorf("GET %s: expected status %d, got %d", url, want, resp.StatusCode)
	}
}
