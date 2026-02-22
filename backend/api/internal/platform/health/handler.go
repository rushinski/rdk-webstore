package health

import (
	"net/http"
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Handler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		err := pool.Ping(ctx)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
    		w.WriteHeader(http.StatusServiceUnavailable) // 503
    	    w.Write([]byte(`{"status":"unhealthy","error":"database unavailable"}`))
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK) // 200
		w.Write([]byte(`{"status":"healthy"}`))
	}
}