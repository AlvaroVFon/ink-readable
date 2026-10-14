// Package migrations embeds the versioned SQL migrations so the API binary can
// apply them without depending on external tooling (the golang-migrate CLI or
// the Docker "migrate" sidecar). The file names follow golang-migrate's
// convention (<version>_<name>.up.sql / .down.sql) so both paths stay
// interoperable through the shared schema_migrations table.
package migrations

import "embed"

// FS exposes the embedded migration files at its root.
//
//go:embed *.sql
var FS embed.FS
