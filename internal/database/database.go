package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

func Initialize(dbPath string) (*sql.DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	// Open database with optimized settings for Pi
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_synchronous=NORMAL&_cache_size=5000&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Limit connections for low-memory environment
	db.SetMaxOpenConns(3)
	db.SetMaxIdleConns(1)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func Migrate(db *sql.DB) error {
	migrations := []string{
		// Users table
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Profiles table
		`CREATE TABLE IF NOT EXISTS profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			avatar_color TEXT DEFAULT '#10b981',
			is_owner BOOLEAN DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,

		// Nodes table (for Sankey diagram)
		`CREATE TABLE IF NOT EXISTS nodes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('income', 'account', 'savings', 'investment', 'expense', 'budget', 'goal')),
			label TEXT NOT NULL,
			institution TEXT,
			amount REAL DEFAULT 0,
			balance REAL DEFAULT 0,
			apy REAL DEFAULT 0,
			budgeted REAL DEFAULT 0,
			goal REAL DEFAULT 0,
			metadata TEXT DEFAULT '{}',
			sort_order INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,

		// Flows table (for Sankey diagram)
		`CREATE TABLE IF NOT EXISTS flows (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			from_node_id INTEGER NOT NULL,
			to_node_id INTEGER NOT NULL,
			amount REAL NOT NULL,
			label TEXT,
			is_recurring BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
			FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
			FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
		)`,

		// Budgets table
		`CREATE TABLE IF NOT EXISTS budgets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			node_id INTEGER,
			name TEXT NOT NULL,
			budgeted REAL NOT NULL,
			period TEXT DEFAULT 'monthly' CHECK(period IN ('weekly', 'monthly', 'yearly')),
			color TEXT DEFAULT '#10b981',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
			FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
		)`,

		// Transactions table
		`CREATE TABLE IF NOT EXISTS transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			budget_id INTEGER NOT NULL,
			amount REAL NOT NULL,
			note TEXT,
			date DATE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
		)`,

		// Goals table
		`CREATE TABLE IF NOT EXISTS goals (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			node_id INTEGER,
			name TEXT NOT NULL,
			target REAL NOT NULL,
			current REAL DEFAULT 0,
			deadline DATE,
			priority INTEGER DEFAULT 0,
			color TEXT DEFAULT '#a855f7',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
			FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE SET NULL
		)`,

		// Goal Transactions table
		`CREATE TABLE IF NOT EXISTS goal_transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			goal_id INTEGER NOT NULL,
			amount REAL NOT NULL,
			note TEXT,
			date DATE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
		)`,

		// Expenses table (fixed costs & subscriptions)
		`CREATE TABLE IF NOT EXISTS expenses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			amount REAL NOT NULL,
			period TEXT DEFAULT 'monthly' CHECK(period IN ('weekly', 'monthly', 'quarterly', 'annual')),
			category TEXT,
			type TEXT DEFAULT 'fixed' CHECK(type IN ('fixed', 'subscription')),
			flag TEXT CHECK(flag IN ('cancel', 'review', NULL)),
			next_due DATE,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,

		// Refresh tokens table
		`CREATE TABLE IF NOT EXISTS refresh_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token_hash TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,

		// Indexes for performance
		`CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_nodes_profile ON nodes(profile_id)`,
		`CREATE INDEX IF NOT EXISTS idx_flows_profile ON flows(profile_id)`,
		`CREATE INDEX IF NOT EXISTS idx_budgets_profile ON budgets(profile_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions(budget_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
		`CREATE INDEX IF NOT EXISTS idx_goals_profile ON goals(profile_id)`,
		`CREATE INDEX IF NOT EXISTS idx_goal_transactions_goal ON goal_transactions(goal_id)`,
		`CREATE INDEX IF NOT EXISTS idx_goal_transactions_date ON goal_transactions(date)`,
		`CREATE INDEX IF NOT EXISTS idx_expenses_profile ON expenses(profile_id)`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w\nSQL: %s", err, migration)
		}
	}

	// Fix nodes table CHECK constraint if needed (migration for existing databases)
	// This recreates the nodes table with the correct constraint including 'budget' and 'goal'
	if err := migrateNodesTableConstraint(db); err != nil {
		return fmt.Errorf("failed to migrate nodes table: %w", err)
	}

	// Add node_id column to budgets table if missing
	if err := migrateBudgetsNodeID(db); err != nil {
		return fmt.Errorf("failed to migrate budgets table: %w", err)
	}

	// Add node_id column to goals table if missing
	if err := migrateGoalsNodeID(db); err != nil {
		return fmt.Errorf("failed to migrate goals table: %w", err)
	}

	return nil
}

func migrateNodesTableConstraint(db *sql.DB) error {
	// Check if migration is needed by trying to insert a test budget node
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Try to detect if the old constraint exists
	_, err = tx.Exec("INSERT INTO nodes (profile_id, type, label) VALUES (-1, 'budget', '__migration_test__')")
	if err == nil {
		// Constraint is already correct, clean up test row
		tx.Exec("DELETE FROM nodes WHERE profile_id = -1 AND label = '__migration_test__'")
		tx.Commit()
		return nil
	}

	// Check if error is the CHECK constraint we're looking for
	if !contains(err.Error(), "CHECK constraint failed") {
		// Different error, not the one we're fixing
		return nil
	}

	tx.Rollback()

	// Need to recreate table with correct constraint
	_, err = db.Exec(`
		BEGIN TRANSACTION;

		-- Create new table with correct constraint
		CREATE TABLE nodes_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('income', 'account', 'savings', 'investment', 'expense', 'budget', 'goal')),
			label TEXT NOT NULL,
			institution TEXT,
			amount REAL DEFAULT 0,
			balance REAL DEFAULT 0,
			apy REAL DEFAULT 0,
			budgeted REAL DEFAULT 0,
			goal REAL DEFAULT 0,
			metadata TEXT DEFAULT '{}',
			sort_order INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		);

		-- Copy existing data
		INSERT INTO nodes_new SELECT * FROM nodes;

		-- Drop old table
		DROP TABLE nodes;

		-- Rename new table
		ALTER TABLE nodes_new RENAME TO nodes;

		-- Recreate index
		CREATE INDEX idx_nodes_profile ON nodes(profile_id);

		COMMIT;
	`)

	return err
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && stringContains(s, substr))
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func migrateBudgetsNodeID(db *sql.DB) error {
	// Check if node_id column exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('budgets') WHERE name='node_id'").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		// Column already exists
		return nil
	}

	// Add the missing column
	_, err = db.Exec("ALTER TABLE budgets ADD COLUMN node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE")
	return err
}

func migrateGoalsNodeID(db *sql.DB) error {
	// Check if node_id column exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('goals') WHERE name='node_id'").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		// Column already exists
		return nil
	}

	// Add the missing column
	_, err = db.Exec("ALTER TABLE goals ADD COLUMN node_id INTEGER REFERENCES nodes(id) ON DELETE SET NULL")
	return err
}
