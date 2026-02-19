package main

import (
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"context"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rushinski/snkreco-backend/internal/api"
	"github.com/rushinski/snkreco-backend/internal/config"
)

func main() {
	// we use a basic logger for startup as we need to load our config to determine which logger we should use
	// we then decide between info or debug logs based on our environment
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg, err := config.Load()
    if err != nil {
        slog.Error("failed to load config",
			"error", err,
		)
        os.Exit(1)
    }

	logLevel := slog.LevelInfo
	if cfg.App.IsDevelopment() {
		logLevel = slog.LevelDebug
	}
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel})
	slog.SetDefault(slog.New(handler))

	slog.Info("config loaded successfully",
		"env", cfg.App.Env,
		"port", cfg.App.Port,
	)

	// creating the connection pool to the databaes
	pool, err := config.NewPool(cfg.Database)
	if err != nil {
		slog.Error("failed to create new pool",
			"error", err,
		)
		os.Exit(1)
	}

	slog.Info("pool succesfully created")
	defer pool.Close() // once main returns (server closes) we close our pool

	// creating the chi router
	router := chi.NewRouter()
	// attaching middleware and CORS policies to the router
	router.Use(
		middleware.RequestID,
		middleware.RealIP,
		middleware.Recoverer,
		middleware.Logger,
		cors.Handler(cors.Options{
			AllowedOrigins: cfg.Security.AllowedOrigins,
			AllowedMethods: cfg.Security.AllowedMethods,
			AllowedHeaders: cfg.Security.AllowedHeaders,
			ExposedHeaders: cfg.Security.ExposedHeaders,
			AllowCredentials: cfg.Security.AllowCredentials,
			MaxAge: cfg.Security.CORSMaxAge,
		}),
	)

	// registers our api routes
	api.RegisterRoutes(router, pool)

	// creates our server object
	srv := &http.Server{
		Addr:         ":" + cfg.App.Port,
		Handler:      router,
		ReadTimeout:  cfg.Security.ReadTimeout,
		WriteTimeout: cfg.Security.WriteTimeout,
		IdleTimeout:  cfg.Security.IdleTimeout,
	}

	// we put this in a goroutine because ListenAndServe runs forever so we need
	// it to run in the background other wise nothing after it would ever run
	go func() {
		err := srv.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			slog.Error("server error",
				"error", err,
			)
			os.Exit(1)
		}
	}()

	// channel listening for 1 OS signal
	// signal notifies the channel when the operator manually closes the server
	// once channel is notified the code after <-quit run
	// SIGINT = signal interrupt SIGTERM = signal terminate
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = srv.Shutdown(ctx)
	if err != nil {
		slog.Error("server forced to shutdown",
			"error", err,
		)
		os.Exit(1)
	}

	slog.Info("server exited")
}
