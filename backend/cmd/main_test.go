package main

import (
	"bufio"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// TestDesktopModeServesAPI builds the real binary and exercises the desktop
// contract end to end: flags, embedded migrations, the stdout ready line and
// the HTTP API on a loopback port chosen by the OS.
func TestDesktopModeServesAPI(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping desktop end-to-end test in -short mode")
	}

	backendDir, err := filepath.Abs("..")
	if err != nil {
		t.Fatalf("resolve backend dir: %v", err)
	}

	binary := filepath.Join(t.TempDir(), "ink-readable-api")
	build := exec.Command("go", "build", "-o", binary, "./cmd")
	build.Dir = backendDir
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build binary: %v\n%s", err, out)
	}

	dataDir := filepath.Join(t.TempDir(), "data")

	cmd := exec.Command(binary, "--desktop", "--port", "0", "--data-dir", dataDir)
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

	baseURL := waitForReady(t, stdout)

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

	backendDir, err := filepath.Abs("..")
	if err != nil {
		t.Fatalf("resolve backend dir: %v", err)
	}

	binary := filepath.Join(t.TempDir(), "ink-readable-api")
	build := exec.Command("go", "build", "-o", binary, "./cmd")
	build.Dir = backendDir
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build binary: %v\n%s", err, out)
	}

	out, err := exec.Command(binary, "--desktop").CombinedOutput()
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
