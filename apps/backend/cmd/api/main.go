package main

import (
	"context"
	"contractors-platform/backend/internal/app"
	"contractors-platform/backend/internal/modules/onboarding/infrastructure"
	"contractors-platform/backend/internal/platform/database"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

func main() {
	host := os.Getenv("HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}
	number, err := strconv.Atoi(port)
	if err != nil || number < 1 || number > 65535 {
		log.Fatal("PORT must be an integer between 1 and 65535")
	}
	handler := app.New()
	// DATABASE_PATH enables SQLite; without it data lives in memory.
	if path := os.Getenv("DATABASE_PATH"); path != "" {
		db, err := database.OpenSQLite(path)
		if err != nil {
			log.Fatal(err)
		}
		defer db.Close()
		repository, err := infrastructure.NewSQLiteRepository(db)
		if err != nil {
			log.Fatal(err)
		}
		handler = app.NewWith(repository)
		log.Printf("Using SQLite database at %s", path)
	}
	server := &http.Server{Addr: net.JoinHostPort(host, port), Handler: handler, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdown); err != nil {
			log.Print(err)
		}
	}()
	log.Printf("API listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
