package models

import (
	"time"
)

// User represents an authenticated user
type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Never expose
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Profile represents a family member or financial entity
type Profile struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	Name        string    `json:"name"`
	AvatarColor string    `json:"avatar_color"`
	IsOwner     bool      `json:"is_owner"`
	CreatedAt   time.Time `json:"created_at"`
}

// Node represents a point in the Sankey cash flow diagram
type Node struct {
	ID          int64   `json:"id"`
	ProfileID   int64   `json:"profile_id"`
	Type        string  `json:"type"` // income, account, savings, investment, expense
	Label       string  `json:"label"`
	Institution string  `json:"institution,omitempty"`
	Amount      float64 `json:"amount,omitempty"`   // For income nodes
	Balance     float64 `json:"balance,omitempty"`  // For account/savings/investment nodes
	APY         float64 `json:"apy,omitempty"`      // For interest-bearing nodes
	Budgeted    float64 `json:"budgeted,omitempty"` // For expense category nodes
	Goal        float64 `json:"goal,omitempty"`     // Target balance for savings
	Metadata    string  `json:"metadata,omitempty"` // JSON for extensibility
	SortOrder   int     `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

// Flow represents money movement between nodes
type Flow struct {
	ID          int64   `json:"id"`
	ProfileID   int64   `json:"profile_id"`
	FromNodeID  int64   `json:"from_node_id"`
	ToNodeID    int64   `json:"to_node_id"`
	Amount      float64 `json:"amount"`
	Label       string  `json:"label,omitempty"`
	IsRecurring bool    `json:"is_recurring"`
	CreatedAt   time.Time `json:"created_at"`
}

// Budget represents a spending category with a limit
type Budget struct {
	ID        int64     `json:"id"`
	ProfileID int64     `json:"profile_id"`
	NodeID    int64     `json:"node_id,omitempty"` // Linked expense node
	Name      string    `json:"name"`
	Budgeted  float64   `json:"budgeted"`
	Period    string    `json:"period"` // weekly, monthly, yearly
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
	// Computed fields (not stored)
	Spent       float64       `json:"spent,omitempty"`
	Remaining   float64       `json:"remaining,omitempty"`
	Percentage  float64       `json:"percentage,omitempty"`
	Transactions []Transaction `json:"transactions,omitempty"`
}

// Transaction represents a single expense against a budget
type Transaction struct {
	ID        int64     `json:"id"`
	BudgetID  int64     `json:"budget_id"`
	Amount    float64   `json:"amount"`
	Note      string    `json:"note,omitempty"`
	Date      string    `json:"date"` // YYYY-MM-DD
	CreatedAt time.Time `json:"created_at"`
}

// GoalTransaction represents a contribution to a savings goal
type GoalTransaction struct {
	ID        int64     `json:"id"`
	GoalID    int64     `json:"goal_id"`
	Amount    float64   `json:"amount"`
	Note      string    `json:"note,omitempty"`
	Date      string    `json:"date"` // YYYY-MM-DD
	CreatedAt time.Time `json:"created_at"`
}

// Goal represents a savings target
type Goal struct {
	ID        int64   `json:"id"`
	ProfileID int64   `json:"profile_id"`
	NodeID    int64   `json:"node_id,omitempty"` // Corresponding node for flows
	Name      string  `json:"name"`
	Target    float64 `json:"target"`
	Current   float64 `json:"current"`
	Deadline  string  `json:"deadline,omitempty"` // YYYY-MM-DD
	Priority  int     `json:"priority"`
	Color     string  `json:"color"`
	CreatedAt time.Time `json:"created_at"`
	// Computed fields
	Percentage    float64            `json:"percentage,omitempty"`
	DaysRemaining int                `json:"days_remaining,omitempty"`
	MonthlyNeeded float64            `json:"monthly_needed,omitempty"`
	Transactions  []GoalTransaction  `json:"transactions,omitempty"`
}

// Expense represents a fixed cost or subscription
type Expense struct {
	ID        int64   `json:"id"`
	ProfileID int64   `json:"profile_id"`
	Name      string  `json:"name"`
	Amount    float64 `json:"amount"`
	Period    string  `json:"period"` // weekly, monthly, quarterly, annual
	Category  string  `json:"category,omitempty"`
	Type      string  `json:"type"` // fixed, subscription
	Flag      string  `json:"flag,omitempty"` // cancel, review, null
	NextDue   string  `json:"next_due,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	// Computed
	MonthlyAmount float64 `json:"monthly_amount,omitempty"`
	AnnualAmount  float64 `json:"annual_amount,omitempty"`
}

// === Request/Response DTOs ===

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"` // For initial profile
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	ExpiresIn    int64    `json:"expires_in"`
	User         User     `json:"user"`
	Profiles     []Profile `json:"profiles"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type CreateProfileRequest struct {
	Name        string `json:"name"`
	AvatarColor string `json:"avatar_color"`
}

type CreateNodeRequest struct {
	Type        string  `json:"type"`
	Label       string  `json:"label"`
	Institution string  `json:"institution,omitempty"`
	Amount      float64 `json:"amount,omitempty"`
	Balance     float64 `json:"balance,omitempty"`
	APY         float64 `json:"apy,omitempty"`
	Budgeted    float64 `json:"budgeted,omitempty"`
	Goal        float64 `json:"goal,omitempty"`
	Metadata    string  `json:"metadata,omitempty"`
}

type CreateFlowRequest struct {
	FromNodeID  int64   `json:"from_node_id"`
	ToNodeID    int64   `json:"to_node_id"`
	Amount      float64 `json:"amount"`
	Label       string  `json:"label,omitempty"`
	IsRecurring bool    `json:"is_recurring"`
}

type CreateBudgetRequest struct {
	NodeID   int64   `json:"node_id,omitempty"`
	Name     string  `json:"name"`
	Budgeted float64 `json:"budgeted"`
	Period   string  `json:"period"`
	Color    string  `json:"color,omitempty"`
}

type CreateTransactionRequest struct {
	Amount float64 `json:"amount"`
	Note   string  `json:"note,omitempty"`
	Date   string  `json:"date,omitempty"` // Defaults to today
}

type CreateGoalTransactionRequest struct {
	Amount float64 `json:"amount"`
	Note   string  `json:"note,omitempty"`
	Date   string  `json:"date,omitempty"` // Defaults to today
}

type CreateGoalRequest struct {
	Name     string  `json:"name"`
	Target   float64 `json:"target"`
	Current  float64 `json:"current"`
	Deadline string  `json:"deadline,omitempty"`
	Priority int     `json:"priority"`
	Color    string  `json:"color,omitempty"`
}

// Dashboard aggregated response
type DashboardResponse struct {
	TotalIncome    float64   `json:"total_income"`
	TotalExpenses  float64   `json:"total_expenses"`
	NetSurplus     float64   `json:"net_surplus"`
	TotalAssets    float64   `json:"total_assets"`
	NetWorth       float64   `json:"net_worth"`
	Nodes          []Node    `json:"nodes"`
	Flows          []Flow    `json:"flows"`
	BudgetSummary  []Budget  `json:"budget_summary"`
	GoalProgress   []Goal    `json:"goal_progress"`
	RecentActivity []Transaction `json:"recent_activity"`
}

// Forecast response
type ForecastResponse struct {
	MonthlyAverage    float64           `json:"monthly_average"`
	AnnualTotal       float64           `json:"annual_total"`
	MonthlyProjection []MonthProjection `json:"monthly_projection"`
	AnnualExpenses    []Expense         `json:"annual_expenses"`
}

type MonthProjection struct {
	Month    string  `json:"month"`
	Baseline float64 `json:"baseline"`
	Spikes   float64 `json:"spikes"`
	Total    float64 `json:"total"`
}
