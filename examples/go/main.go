/*
Example Go Application with VLogger

This example demonstrates how to integrate VLogger with a Go application using Gin.
Compatible with Go 1.19+
*/

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// User represents a user in our mock data
type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// LoginRequest represents login request data
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Mock data
var users = []User{
	{ID: 1, Name: "John Doe", Email: "john@example.com"},
	{ID: 2, Name: "Jane Smith", Email: "jane@example.com"},
	{ID: 3, Name: "Bob Johnson", Email: "bob@example.com"},
}

func main() {
	// Check Go version (basic check)
	version := runtime.Version()
	fmt.Printf("Go version: %s\n", version)

	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)

	// Create Gin router
	r := gin.Default()

	// CORS middleware for development
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// TODO: Add VLogger middleware here
	// r.Use(vlogger.Middleware())

	// Routes
	r.GET("/", handleHome)
	r.GET("/users", getUsers)
	r.POST("/users", createUser)
	r.GET("/users/:id", getUser)
	r.PUT("/users/:id", updateUser)
	r.DELETE("/users/:id", deleteUser)
	r.POST("/login", handleLogin)
	r.GET("/error", handleError)
	r.GET("/slow", handleSlow)
	r.GET("/health", handleHealth)

	// 404 handler
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"error": "Endpoint not found",
			"path":  c.Request.URL.Path,
		})
	})

	fmt.Println("🚀 Starting Go server with VLogger...")
	fmt.Println("📊 VLogger dashboard: http://localhost:3333")
	fmt.Println("")
	fmt.Println("Try these endpoints:")
	fmt.Println("  GET  http://localhost:8080/")
	fmt.Println("  GET  http://localhost:8080/users")
	fmt.Println("  POST http://localhost:8080/users")
	fmt.Println("  GET  http://localhost:8080/error")
	fmt.Println("  GET  http://localhost:8080/slow?delay=3")

	// Start server
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func handleHome(c *gin.Context) {
	c.JSON(200, gin.H{
		"message":    "Welcome to VLogger Go Example API",
		"timestamp":  time.Now().Format(time.RFC3339),
		"go_version": runtime.Version(),
		"endpoints": []string{
			"GET /",
			"GET /users",
			"POST /users",
			"GET /users/{id}",
			"PUT /users/{id}",
			"DELETE /users/{id}",
			"POST /login",
			"GET /error",
			"GET /slow",
			"GET /health",
		},
	})
}

func getUsers(c *gin.Context) {
	c.JSON(200, gin.H{
		"users": users,
		"total": len(users),
	})
}

func createUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(400, gin.H{"error": "Invalid JSON"})
		return
	}

	if newUser.Name == "" || newUser.Email == "" {
		c.JSON(400, gin.H{"error": "Name and email are required"})
		return
	}

	// Find max ID
	maxID := 0
	for _, user := range users {
		if user.ID > maxID {
			maxID = user.ID
		}
	}

	newUser.ID = maxID + 1
	users = append(users, newUser)

	c.JSON(201, newUser)
}

func getUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	for _, user := range users {
		if user.ID == id {
			c.JSON(200, user)
			return
		}
	}

	c.JSON(404, gin.H{
		"error": "User not found",
		"id":    id,
	})
}

func updateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	for i, user := range users {
		if user.ID == id {
			var updateData User
			if err := c.ShouldBindJSON(&updateData); err != nil {
				c.JSON(400, gin.H{"error": "Invalid JSON"})
				return
			}

			if updateData.Name != "" {
				users[i].Name = updateData.Name
			}
			if updateData.Email != "" {
				users[i].Email = updateData.Email
			}

			c.JSON(200, users[i])
			return
		}
	}

	c.JSON(404, gin.H{
		"error": "User not found",
		"id":    id,
	})
}

func deleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	for i, user := range users {
		if user.ID == id {
			users = append(users[:i], users[i+1:]...)
			c.Status(204)
			return
		}
	}

	c.JSON(404, gin.H{
		"error": "User not found",
		"id":    id,
	})
}

func handleLogin(c *gin.Context) {
	var loginReq LoginRequest
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(400, gin.H{"error": "Invalid JSON"})
		return
	}

	if loginReq.Email == "" || loginReq.Password == "" {
		c.JSON(400, gin.H{"error": "Email and password are required"})
		return
	}

	// Mock authentication
	if loginReq.Email == "john@example.com" && loginReq.Password == "password" {
		c.JSON(200, gin.H{
			"message": "Login successful",
			"user": gin.H{
				"id":    1,
				"name":  "John Doe",
				"email": "john@example.com",
			},
			"token": fmt.Sprintf("mock-jwt-token-%d", time.Now().Unix()),
		})
	} else {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
	}
}

func handleError(c *gin.Context) {
	// Simulate an error
	panic("This is a test error for VLogger")
}

func handleSlow(c *gin.Context) {
	delayStr := c.DefaultQuery("delay", "2")
	delay, err := strconv.Atoi(delayStr)
	if err != nil || delay < 1 || delay > 10 {
		delay = 2
	}

	time.Sleep(time.Duration(delay) * time.Second)

	c.JSON(200, gin.H{
		"message": "Slow response completed",
		"delay":   fmt.Sprintf("%d seconds", delay),
	})
}

func handleHealth(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	c.JSON(200, gin.H{
		"status":       "healthy",
		"timestamp":    time.Now().Format(time.RFC3339),
		"go_version":   runtime.Version(),
		"memory_usage": m.Alloc,
		"memory_total": m.TotalAlloc,
		"goroutines":   runtime.NumGoroutine(),
	})
}