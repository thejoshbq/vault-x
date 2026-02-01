package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/thejoshbq/vault-x/internal/config"
	"github.com/thejoshbq/vault-x/internal/database"
	"github.com/thejoshbq/vault-x/internal/handlers"
	"github.com/thejoshbq/vault-x/internal/middleware"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Initialize(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Create Fiber app with minimal memory config
	app := fiber.New(fiber.Config{
		AppName:       "Budget System v2.0.26",
		Prefork:       false, // Single process for Pi
		ServerHeader:  "BudgetSys",
		CaseSensitive: true,
		StrictRouting: true,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "${time} | ${status} | ${latency} | ${method} ${path}\n",
		TimeFormat: "15:04:05",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Authorization",
		AllowCredentials: true,
	}))

	// Initialize handlers
	h := handlers.New(db, cfg)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "operational",
			"version": "2.0.26",
		})
	})

	// API routes
	api := app.Group("/api")

	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/register", h.Register)
	auth.Post("/login", h.Login)
	auth.Post("/refresh", h.RefreshToken)

	// Protected routes
	protected := api.Group("/", middleware.JWTAuth(cfg.JWTSecret))

	// Profile routes
	profiles := protected.Group("/profiles")
	profiles.Get("/", h.ListProfiles)
	profiles.Post("/", h.CreateProfile)
	profiles.Get("/:profileId", h.GetProfile)
	profiles.Put("/:profileId", h.UpdateProfile)
	profiles.Delete("/:profileId", h.DeleteProfile)

	// Node routes (Sankey diagram)
	profiles.Get("/:profileId/nodes", h.ListNodes)
	profiles.Post("/:profileId/nodes", h.CreateNode)
	profiles.Put("/:profileId/nodes/:nodeId", h.UpdateNode)
	profiles.Delete("/:profileId/nodes/:nodeId", h.DeleteNode)

	// Flow routes (Sankey diagram)
	profiles.Get("/:profileId/flows", h.ListFlows)
	profiles.Post("/:profileId/flows", h.CreateFlow)
	profiles.Put("/:profileId/flows/:flowId", h.UpdateFlow)
	profiles.Delete("/:profileId/flows/:flowId", h.DeleteFlow)

	// Budget routes
	profiles.Get("/:profileId/budgets", h.ListBudgets)
	profiles.Post("/:profileId/budgets", h.CreateBudget)
	profiles.Put("/:profileId/budgets/:budgetId", h.UpdateBudget)
	profiles.Delete("/:profileId/budgets/:budgetId", h.DeleteBudget)

	// Transaction routes
	profiles.Get("/:profileId/budgets/:budgetId/transactions", h.ListTransactions)
	profiles.Post("/:profileId/budgets/:budgetId/transactions", h.CreateTransaction)
	profiles.Delete("/:profileId/budgets/:budgetId/transactions/:txId", h.DeleteTransaction)

	// Goal routes
	profiles.Get("/:profileId/goals", h.ListGoals)
	profiles.Post("/:profileId/goals", h.CreateGoal)
	profiles.Put("/:profileId/goals/:goalId", h.UpdateGoal)
	profiles.Delete("/:profileId/goals/:goalId", h.DeleteGoal)

	// Goal Transaction routes
	profiles.Get("/:profileId/goals/:goalId/transactions", h.ListGoalTransactions)
	profiles.Post("/:profileId/goals/:goalId/transactions", h.CreateGoalTransaction)
	profiles.Delete("/:profileId/goals/:goalId/transactions/:txId", h.DeleteGoalTransaction)

	// Dashboard aggregation
	profiles.Get("/:profileId/dashboard", h.GetDashboard)
	profiles.Get("/:profileId/forecast", h.GetForecast)

	// Serve static files (React build)
	app.Static("/", "./web/dist")
	app.Get("/*", func(c *fiber.Ctx) error {
		return c.SendFile("./web/dist/index.html")
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Budget System starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
