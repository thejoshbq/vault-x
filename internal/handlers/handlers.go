package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"github.com/thejoshbq/vault-x/internal/config"
	"github.com/thejoshbq/vault-x/internal/middleware"
	"github.com/thejoshbq/vault-x/internal/models"
)

type Handler struct {
	db  *sql.DB
	cfg *config.Config
}

func New(db *sql.DB, cfg *config.Config) *Handler {
	return &Handler{db: db, cfg: cfg}
}

// Helper to get user ID from context
func (h *Handler) getUserID(c *fiber.Ctx) int64 {
	return c.Locals("userID").(int64)
}

// Helper to parse profile ID from params and validate ownership
func (h *Handler) getProfileID(c *fiber.Ctx) (int64, error) {
	profileID, err := strconv.ParseInt(c.Params("profileId"), 10, 64)
	if err != nil {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid profile ID")
	}

	// Verify user owns this profile
	userID := h.getUserID(c)
	var count int
	err = h.db.QueryRow("SELECT COUNT(*) FROM profiles WHERE id = ? AND user_id = ?", profileID, userID).Scan(&count)
	if err != nil || count == 0 {
		return 0, fiber.NewError(fiber.StatusForbidden, "profile not found or access denied")
	}

	return profileID, nil
}

// ============================================
// AUTH HANDLERS
// ============================================

func (h *Handler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Validate
	if req.Email == "" || req.Password == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email, password, and name are required"})
	}

	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password must be at least 8 characters"})
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), h.cfg.BcryptCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	// Start transaction
	tx, err := h.db.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer tx.Rollback()

	// Create user
	result, err := tx.Exec("INSERT INTO users (email, password_hash) VALUES (?, ?)", req.Email, string(hash))
	if err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email already registered"})
	}

	userID, err := result.LastInsertId()
	if err != nil || userID == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get user ID"})
	}

	// Create default profile
	_, err = tx.Exec(
		"INSERT INTO profiles (user_id, name, avatar_color, is_owner) VALUES (?, ?, ?, 1)",
		userID, req.Name, "#10b981",
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create profile"})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to complete registration"})
	}

	// Generate tokens and return
	return h.generateAuthResponse(c, userID, req.Email)
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Find user
	var user models.User
	err := h.db.QueryRow(
		"SELECT id, email, password_hash FROM users WHERE email = ?",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash)

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	return h.generateAuthResponse(c, user.ID, user.Email)
}

func (h *Handler) RefreshToken(c *fiber.Ctx) error {
	var req models.RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Hash the refresh token to compare
	tokenHash := sha256Hash(req.RefreshToken)

	// Find valid refresh token
	var userID int64
	var email string
	err := h.db.QueryRow(`
		SELECT u.id, u.email FROM refresh_tokens rt
		JOIN users u ON rt.user_id = u.id
		WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')
	`, tokenHash).Scan(&userID, &email)

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	// Delete old refresh token
	h.db.Exec("DELETE FROM refresh_tokens WHERE token_hash = ?", tokenHash)

	return h.generateAuthResponse(c, userID, email)
}

func (h *Handler) generateAuthResponse(c *fiber.Ctx, userID int64, email string) error {
	// Generate access token
	accessToken, err := middleware.GenerateToken(userID, email, h.cfg.JWTSecret, h.cfg.JWTExpiry)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	// Generate refresh token
	refreshToken := generateRandomToken()
	refreshHash := sha256Hash(refreshToken)

	// Store refresh token
	_, err = h.db.Exec(
		"INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
		userID, refreshHash, time.Now().Add(h.cfg.RefreshExpiry),
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to store refresh token"})
	}

	// Fetch profiles
	profiles := []models.Profile{}
	rows, _ := h.db.Query("SELECT id, user_id, name, avatar_color, is_owner, created_at FROM profiles WHERE user_id = ?", userID)
	defer rows.Close()
	for rows.Next() {
		var p models.Profile
		rows.Scan(&p.ID, &p.UserID, &p.Name, &p.AvatarColor, &p.IsOwner, &p.CreatedAt)
		profiles = append(profiles, p)
	}

	return c.JSON(models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(h.cfg.JWTExpiry.Seconds()),
		User: models.User{
			ID:    userID,
			Email: email,
		},
		Profiles: profiles,
	})
}

// ============================================
// PROFILE HANDLERS
// ============================================

func (h *Handler) ListProfiles(c *fiber.Ctx) error {
	userID := h.getUserID(c)

	rows, err := h.db.Query(
		"SELECT id, user_id, name, avatar_color, is_owner, created_at FROM profiles WHERE user_id = ? ORDER BY is_owner DESC, name",
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer rows.Close()

	profiles := []models.Profile{}
	for rows.Next() {
		var p models.Profile
		rows.Scan(&p.ID, &p.UserID, &p.Name, &p.AvatarColor, &p.IsOwner, &p.CreatedAt)
		profiles = append(profiles, p)
	}

	return c.JSON(profiles)
}

func (h *Handler) CreateProfile(c *fiber.Ctx) error {
	userID := h.getUserID(c)

	var req models.CreateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	if req.AvatarColor == "" {
		req.AvatarColor = "#10b981"
	}

	result, err := h.db.Exec(
		"INSERT INTO profiles (user_id, name, avatar_color) VALUES (?, ?, ?)",
		userID, req.Name, req.AvatarColor,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create profile"})
	}

	id, err := result.LastInsertId()
	if err != nil || id == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get profile ID"})
	}
	return c.Status(fiber.StatusCreated).JSON(models.Profile{
		ID:          id,
		UserID:      userID,
		Name:        req.Name,
		AvatarColor: req.AvatarColor,
		IsOwner:     false,
		CreatedAt:   time.Now(),
	})
}

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	var p models.Profile
	err = h.db.QueryRow(
		"SELECT id, user_id, name, avatar_color, is_owner, created_at FROM profiles WHERE id = ?",
		profileID,
	).Scan(&p.ID, &p.UserID, &p.Name, &p.AvatarColor, &p.IsOwner, &p.CreatedAt)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "profile not found"})
	}

	return c.JSON(p)
}

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	var req models.CreateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	_, err = h.db.Exec(
		"UPDATE profiles SET name = COALESCE(NULLIF(?, ''), name), avatar_color = COALESCE(NULLIF(?, ''), avatar_color) WHERE id = ?",
		req.Name, req.AvatarColor, profileID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update profile"})
	}

	return h.GetProfile(c)
}

func (h *Handler) DeleteProfile(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	// Prevent deleting owner profile
	var isOwner bool
	h.db.QueryRow("SELECT is_owner FROM profiles WHERE id = ?", profileID).Scan(&isOwner)
	if isOwner {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "cannot delete owner profile"})
	}

	_, err = h.db.Exec("DELETE FROM profiles WHERE id = ?", profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete profile"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ============================================
// NODE HANDLERS (Sankey)
// ============================================

func (h *Handler) ListNodes(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	rows, err := h.db.Query(`
		SELECT id, profile_id, type, label, institution, amount, balance, apy, budgeted, goal, metadata, sort_order, created_at
		FROM nodes WHERE profile_id = ? ORDER BY sort_order, created_at
	`, profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer rows.Close()

	nodes := []models.Node{}
	for rows.Next() {
		var n models.Node
		var institution, metadata sql.NullString
		rows.Scan(&n.ID, &n.ProfileID, &n.Type, &n.Label, &institution, &n.Amount, &n.Balance, &n.APY, &n.Budgeted, &n.Goal, &metadata, &n.SortOrder, &n.CreatedAt)
		n.Institution = institution.String
		n.Metadata = metadata.String
		nodes = append(nodes, n)
	}

	return c.JSON(nodes)
}

func (h *Handler) CreateNode(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	var req models.CreateNodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Validate type
	validTypes := map[string]bool{"income": true, "account": true, "savings": true, "investment": true, "expense": true, "budget": true}
	if !validTypes[req.Type] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid node type"})
	}

	result, err := h.db.Exec(`
		INSERT INTO nodes (profile_id, type, label, institution, amount, balance, apy, budgeted, goal, metadata)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, profileID, req.Type, req.Label, req.Institution, req.Amount, req.Balance, req.APY, req.Budgeted, req.Goal, req.Metadata)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("failed to create node: %v", err)})
	}

	id, err := result.LastInsertId()
	if err != nil || id == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get node ID"})
	}

	return c.Status(fiber.StatusCreated).JSON(models.Node{
		ID:          id,
		ProfileID:   profileID,
		Type:        req.Type,
		Label:       req.Label,
		Institution: req.Institution,
		Amount:      req.Amount,
		Balance:     req.Balance,
		APY:         req.APY,
		Budgeted:    req.Budgeted,
		Goal:        req.Goal,
		Metadata:    req.Metadata,
		CreatedAt:   time.Now(),
	})
}

func (h *Handler) UpdateNode(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	nodeID, err := strconv.ParseInt(c.Params("nodeId"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid node ID"})
	}

	var req models.CreateNodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	_, err = h.db.Exec(`
		UPDATE nodes SET 
			label = COALESCE(NULLIF(?, ''), label),
			institution = ?,
			amount = ?,
			balance = ?,
			apy = ?,
			budgeted = ?,
			goal = ?,
			metadata = COALESCE(NULLIF(?, ''), metadata)
		WHERE id = ? AND profile_id = ?
	`, req.Label, req.Institution, req.Amount, req.Balance, req.APY, req.Budgeted, req.Goal, req.Metadata, nodeID, profileID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update node"})
	}

	return c.JSON(fiber.Map{"id": nodeID, "updated": true})
}

func (h *Handler) DeleteNode(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	nodeID, _ := strconv.ParseInt(c.Params("nodeId"), 10, 64)

	// Delete associated flows first
	h.db.Exec("DELETE FROM flows WHERE from_node_id = ? OR to_node_id = ?", nodeID, nodeID)

	_, err = h.db.Exec("DELETE FROM nodes WHERE id = ? AND profile_id = ?", nodeID, profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete node"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ============================================
// FLOW HANDLERS (Sankey)
// ============================================

func (h *Handler) ListFlows(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	rows, err := h.db.Query(`
		SELECT id, profile_id, from_node_id, to_node_id, amount, label, is_recurring, created_at
		FROM flows WHERE profile_id = ?
	`, profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer rows.Close()

	flows := []models.Flow{}
	for rows.Next() {
		var f models.Flow
		var label sql.NullString
		rows.Scan(&f.ID, &f.ProfileID, &f.FromNodeID, &f.ToNodeID, &f.Amount, &label, &f.IsRecurring, &f.CreatedAt)
		f.Label = label.String
		flows = append(flows, f)
	}

	return c.JSON(flows)
}

func (h *Handler) CreateFlow(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	var req models.CreateFlowRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	result, err := h.db.Exec(`
		INSERT INTO flows (profile_id, from_node_id, to_node_id, amount, label, is_recurring)
		VALUES (?, ?, ?, ?, ?, ?)
	`, profileID, req.FromNodeID, req.ToNodeID, req.Amount, req.Label, req.IsRecurring)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create flow"})
	}

	id, err := result.LastInsertId()
	if err != nil || id == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get flow ID"})
	}
	return c.Status(fiber.StatusCreated).JSON(models.Flow{
		ID:          id,
		ProfileID:   profileID,
		FromNodeID:  req.FromNodeID,
		ToNodeID:    req.ToNodeID,
		Amount:      req.Amount,
		Label:       req.Label,
		IsRecurring: req.IsRecurring,
		CreatedAt:   time.Now(),
	})
}

func (h *Handler) UpdateFlow(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	flowID, _ := strconv.ParseInt(c.Params("flowId"), 10, 64)

	var req models.CreateFlowRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	_, err = h.db.Exec(`
		UPDATE flows SET amount = ?, label = ?, is_recurring = ?
		WHERE id = ? AND profile_id = ?
	`, req.Amount, req.Label, req.IsRecurring, flowID, profileID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update flow"})
	}

	return c.JSON(fiber.Map{"id": flowID, "updated": true})
}

func (h *Handler) DeleteFlow(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	flowID, _ := strconv.ParseInt(c.Params("flowId"), 10, 64)

	_, err = h.db.Exec("DELETE FROM flows WHERE id = ? AND profile_id = ?", flowID, profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete flow"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ============================================
// BUDGET & TRANSACTION HANDLERS
// ============================================

func (h *Handler) ListBudgets(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	// Get current month boundaries
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	rows, err := h.db.Query(`
		SELECT b.id, b.profile_id, b.node_id, b.name, b.budgeted, b.period, b.color, b.created_at,
			COALESCE(SUM(t.amount), 0) as spent
		FROM budgets b
		LEFT JOIN transactions t ON b.id = t.budget_id
			AND t.date >= ? AND t.date < ?
		WHERE b.profile_id = ?
		GROUP BY b.id
		ORDER BY b.name
	`, monthStart.Format("2006-01-02"), monthEnd.Format("2006-01-02"), profileID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer rows.Close()

	budgets := []models.Budget{}
	for rows.Next() {
		var b models.Budget
		var nodeID sql.NullInt64
		rows.Scan(&b.ID, &b.ProfileID, &nodeID, &b.Name, &b.Budgeted, &b.Period, &b.Color, &b.CreatedAt, &b.Spent)
		if nodeID.Valid {
			b.NodeID = nodeID.Int64
		}
		b.Remaining = b.Budgeted - b.Spent
		if b.Budgeted > 0 {
			b.Percentage = (b.Spent / b.Budgeted) * 100
		}
		budgets = append(budgets, b)
	}

	return c.JSON(budgets)
}

func (h *Handler) CreateBudget(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	var req models.CreateBudgetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Period == "" {
		req.Period = "monthly"
	}
	if req.Color == "" {
		req.Color = "#10b981"
	}

	result, err := h.db.Exec(`
		INSERT INTO budgets (profile_id, node_id, name, budgeted, period, color)
		VALUES (?, ?, ?, ?, ?, ?)
	`, profileID, req.NodeID, req.Name, req.Budgeted, req.Period, req.Color)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("failed to create budget: %v", err)})
	}

	id, err := result.LastInsertId()
	if err != nil || id == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get budget ID"})
	}
	return c.Status(fiber.StatusCreated).JSON(models.Budget{
		ID:        id,
		ProfileID: profileID,
		NodeID:    req.NodeID,
		Name:      req.Name,
		Budgeted:  req.Budgeted,
		Period:    req.Period,
		Color:     req.Color,
		CreatedAt: time.Now(),
	})
}

func (h *Handler) UpdateBudget(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	budgetID, _ := strconv.ParseInt(c.Params("budgetId"), 10, 64)

	var req models.CreateBudgetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	_, err = h.db.Exec(`
		UPDATE budgets SET name = ?, budgeted = ?, period = ?, color = ?
		WHERE id = ? AND profile_id = ?
	`, req.Name, req.Budgeted, req.Period, req.Color, budgetID, profileID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update budget"})
	}

	return c.JSON(fiber.Map{"id": budgetID, "updated": true})
}

func (h *Handler) DeleteBudget(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	budgetID, _ := strconv.ParseInt(c.Params("budgetId"), 10, 64)

	_, err = h.db.Exec("DELETE FROM budgets WHERE id = ? AND profile_id = ?", budgetID, profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete budget"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListTransactions(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	budgetID, _ := strconv.ParseInt(c.Params("budgetId"), 10, 64)

	// Verify budget belongs to profile
	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM budgets WHERE id = ? AND profile_id = ?", budgetID, profileID).Scan(&count)
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "budget not found"})
	}

	rows, err := h.db.Query(`
		SELECT id, budget_id, amount, note, date, created_at
		FROM transactions WHERE budget_id = ?
		ORDER BY date DESC, created_at DESC
		LIMIT 100
	`, budgetID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer rows.Close()

	transactions := []models.Transaction{}
	for rows.Next() {
		var t models.Transaction
		var note sql.NullString
		rows.Scan(&t.ID, &t.BudgetID, &t.Amount, &note, &t.Date, &t.CreatedAt)
		t.Note = note.String
		transactions = append(transactions, t)
	}

	return c.JSON(transactions)
}

func (h *Handler) CreateTransaction(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	budgetID, _ := strconv.ParseInt(c.Params("budgetId"), 10, 64)

	// Verify budget belongs to profile
	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM budgets WHERE id = ? AND profile_id = ?", budgetID, profileID).Scan(&count)
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "budget not found"})
	}

	var req models.CreateTransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}

	result, err := h.db.Exec(`
		INSERT INTO transactions (budget_id, amount, note, date)
		VALUES (?, ?, ?, ?)
	`, budgetID, req.Amount, req.Note, req.Date)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create transaction"})
	}

	id, err := result.LastInsertId()
	if err != nil || id == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get transaction ID"})
	}
	return c.Status(fiber.StatusCreated).JSON(models.Transaction{
		ID:        id,
		BudgetID:  budgetID,
		Amount:    req.Amount,
		Note:      req.Note,
		Date:      req.Date,
		CreatedAt: time.Now(),
	})
}

func (h *Handler) DeleteTransaction(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	budgetID, _ := strconv.ParseInt(c.Params("budgetId"), 10, 64)
	txID, _ := strconv.ParseInt(c.Params("txId"), 10, 64)

	// Verify budget belongs to profile
	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM budgets WHERE id = ? AND profile_id = ?", budgetID, profileID).Scan(&count)
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "budget not found"})
	}

	_, err = h.db.Exec("DELETE FROM transactions WHERE id = ? AND budget_id = ?", txID, budgetID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete transaction"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ============================================
// GOAL HANDLERS
// ============================================

func (h *Handler) ListGoals(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	rows, err := h.db.Query(`
		SELECT id, profile_id, node_id, name, target, current, deadline, priority, color, created_at
		FROM goals WHERE profile_id = ?
		ORDER BY priority, deadline
	`, profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer rows.Close()

	goals := []models.Goal{}
	for rows.Next() {
		var g models.Goal
		var deadline sql.NullString
		var nodeID sql.NullInt64
		rows.Scan(&g.ID, &g.ProfileID, &nodeID, &g.Name, &g.Target, &g.Current, &deadline, &g.Priority, &g.Color, &g.CreatedAt)
		g.Deadline = deadline.String
		if nodeID.Valid {
			g.NodeID = nodeID.Int64
		}

		// Compute derived fields
		if g.Target > 0 {
			g.Percentage = (g.Current / g.Target) * 100
		}
		if g.Deadline != "" {
			if deadlineDate, err := time.Parse("2006-01-02", g.Deadline); err == nil {
				g.DaysRemaining = int(time.Until(deadlineDate).Hours() / 24)
				if g.DaysRemaining > 0 {
					g.MonthlyNeeded = (g.Target - g.Current) / (float64(g.DaysRemaining) / 30)
				}
			}
		}

		goals = append(goals, g)
	}

	return c.JSON(goals)
}

func (h *Handler) CreateGoal(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	var req models.CreateGoalRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Color == "" {
		req.Color = "#a855f7"
	}

	// Start transaction to create both goal and node
	tx, err := h.db.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer tx.Rollback()

	// Create corresponding node for the goal
	nodeResult, err := tx.Exec(`
		INSERT INTO nodes (profile_id, type, label, balance, goal)
		VALUES (?, 'goal', ?, ?, ?)
	`, profileID, req.Name, req.Current, req.Target)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create node"})
	}
	nodeID, err := nodeResult.LastInsertId()
	if err != nil || nodeID == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get node ID"})
	}

	// Create goal
	result, err := tx.Exec(`
		INSERT INTO goals (profile_id, node_id, name, target, current, deadline, priority, color)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, profileID, nodeID, req.Name, req.Target, req.Current, req.Deadline, req.Priority, req.Color)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create goal"})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to commit transaction"})
	}

	id, err := result.LastInsertId()
	if err != nil || id == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get goal ID"})
	}
	return c.Status(fiber.StatusCreated).JSON(models.Goal{
		ID:        id,
		ProfileID: profileID,
		NodeID:    nodeID,
		Name:      req.Name,
		Target:    req.Target,
		Current:   req.Current,
		Deadline:  req.Deadline,
		Priority:  req.Priority,
		Color:     req.Color,
		CreatedAt: time.Now(),
	})
}

func (h *Handler) UpdateGoal(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	goalID, _ := strconv.ParseInt(c.Params("goalId"), 10, 64)

	var req models.CreateGoalRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	_, err = h.db.Exec(`
		UPDATE goals SET name = ?, target = ?, current = ?, deadline = ?, priority = ?, color = ?
		WHERE id = ? AND profile_id = ?
	`, req.Name, req.Target, req.Current, req.Deadline, req.Priority, req.Color, goalID, profileID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update goal"})
	}

	return c.JSON(fiber.Map{"id": goalID, "updated": true})
}

func (h *Handler) DeleteGoal(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	goalID, _ := strconv.ParseInt(c.Params("goalId"), 10, 64)

	_, err = h.db.Exec("DELETE FROM goals WHERE id = ? AND profile_id = ?", goalID, profileID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete goal"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ============================================
// GOAL TRANSACTION HANDLERS
// ============================================

func (h *Handler) ListGoalTransactions(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	goalID, _ := strconv.ParseInt(c.Params("goalId"), 10, 64)

	// Verify goal belongs to profile
	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM goals WHERE id = ? AND profile_id = ?", goalID, profileID).Scan(&count)
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "goal not found"})
	}

	rows, err := h.db.Query(`
		SELECT id, goal_id, amount, note, date, created_at
		FROM goal_transactions WHERE goal_id = ?
		ORDER BY date DESC, created_at DESC
		LIMIT 100
	`, goalID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch transactions"})
	}
	defer rows.Close()

	transactions := []models.GoalTransaction{}
	for rows.Next() {
		var tx models.GoalTransaction
		rows.Scan(&tx.ID, &tx.GoalID, &tx.Amount, &tx.Note, &tx.Date, &tx.CreatedAt)
		transactions = append(transactions, tx)
	}

	return c.JSON(transactions)
}

func (h *Handler) CreateGoalTransaction(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	goalID, _ := strconv.ParseInt(c.Params("goalId"), 10, 64)

	// Verify goal belongs to profile
	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM goals WHERE id = ? AND profile_id = ?", goalID, profileID).Scan(&count)
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "goal not found"})
	}

	var req models.CreateGoalTransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}

	// Start transaction to update both tables
	tx, err := h.db.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer tx.Rollback()

	// Insert transaction
	result, err := tx.Exec(`
		INSERT INTO goal_transactions (goal_id, amount, note, date)
		VALUES (?, ?, ?, ?)
	`, goalID, req.Amount, req.Note, req.Date)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create transaction"})
	}

	// Update goal's current amount
	_, err = tx.Exec(`
		UPDATE goals SET current = current + ?
		WHERE id = ?
	`, req.Amount, goalID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update goal"})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to commit transaction"})
	}

	id, err := result.LastInsertId()
	if err != nil || id == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get goal transaction ID"})
	}
	return c.Status(fiber.StatusCreated).JSON(models.GoalTransaction{
		ID:       id,
		GoalID:   goalID,
		Amount:   req.Amount,
		Note:     req.Note,
		Date:     req.Date,
		CreatedAt: time.Now(),
	})
}

func (h *Handler) DeleteGoalTransaction(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	goalID, _ := strconv.ParseInt(c.Params("goalId"), 10, 64)
	txID, _ := strconv.ParseInt(c.Params("txId"), 10, 64)

	// Verify goal belongs to profile
	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM goals WHERE id = ? AND profile_id = ?", goalID, profileID).Scan(&count)
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "goal not found"})
	}

	// Get transaction amount before deleting
	var amount float64
	err = h.db.QueryRow("SELECT amount FROM goal_transactions WHERE id = ? AND goal_id = ?", txID, goalID).Scan(&amount)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "transaction not found"})
	}

	// Start transaction to update both tables
	tx, err := h.db.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	defer tx.Rollback()

	// Delete transaction
	_, err = tx.Exec("DELETE FROM goal_transactions WHERE id = ? AND goal_id = ?", txID, goalID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete transaction"})
	}

	// Update goal's current amount (subtract the deleted transaction)
	_, err = tx.Exec(`
		UPDATE goals SET current = current - ?
		WHERE id = ?
	`, amount, goalID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update goal"})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to commit transaction"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ============================================
// DASHBOARD / AGGREGATION HANDLERS
// ============================================

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	// This would aggregate data from multiple tables
	// For now, return a simple structure
	return c.JSON(fiber.Map{
		"profile_id": profileID,
		"message":    "Dashboard data - implement aggregation logic",
	})
}

func (h *Handler) GetForecast(c *fiber.Ctx) error {
	profileID, err := h.getProfileID(c)
	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"profile_id": profileID,
		"message":    "Forecast data - implement projection logic",
	})
}

// ============================================
// HELPERS
// ============================================

func generateRandomToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func sha256Hash(s string) string {
	h := sha256.New()
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}
