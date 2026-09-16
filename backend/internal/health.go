// Package health provides the application healthcheck endpoint.
package health

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

type response struct {
	Status   string `json:"status"`
	DBStatus string `json:"DBStatus"`
	Uptime   string `json:"uptime"`
}

type handler struct {
	db        *sql.DB
	startedAt time.Time
}

func NewHandler(db *sql.DB, startedAt time.Time) http.Handler {
	return &handler{db: db, startedAt: startedAt}
}

func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	dbStatus := "ok"
	status := "ok"
	statusCode := http.StatusOK
	if err := h.db.PingContext(r.Context()); err != nil {
		dbStatus = "error"
		status = "degraded"
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(response{
		Status:   status,
		DBStatus: dbStatus,
		Uptime:   time.Since(h.startedAt).String(),
	})
}
