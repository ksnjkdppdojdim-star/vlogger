/*
 * Example Java Application with VLogger
 * 
 * This example demonstrates how to integrate VLogger with a Java application.
 * Compatible with Java 11+
 */

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class App {
    private static final ObjectMapper mapper = new ObjectMapper();
    private static final Map<Integer, User> users = new ConcurrentHashMap<>();
    private static final AtomicInteger userIdCounter = new AtomicInteger(1);
    
    static {
        // Initialize mock data
        users.put(1, new User(1, "John Doe", "john@example.com"));
        users.put(2, new User(2, "Jane Smith", "jane@example.com"));
        users.put(3, new User(3, "Bob Johnson", "bob@example.com"));
        userIdCounter.set(4);
    }
    
    public static void main(String[] args) throws IOException {
        // Check Java version
        String javaVersion = System.getProperty("java.version");
        System.out.println("Java version: " + javaVersion);
        
        if (!isJavaVersionSupported()) {
            System.err.println("VLogger requires Java 11 or higher. Current version: " + javaVersion);
            System.exit(1);
        }
        
        // Create HTTP server
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        
        // TODO: Add VLogger middleware here
        
        // Register handlers
        server.createContext("/", new HomeHandler());
        server.createContext("/users", new UsersHandler());
        server.createContext("/login", new LoginHandler());
        server.createContext("/error", new ErrorHandler());
        server.createContext("/slow", new SlowHandler());
        server.createContext("/health", new HealthHandler());
        
        // Start server
        server.setExecutor(null);
        server.start();
        
        System.out.println("🚀 Starting Java server with VLogger...");
        System.out.println("📊 VLogger dashboard: http://localhost:3333");
        System.out.println("");
        System.out.println("Try these endpoints:");
        System.out.println("  GET  http://localhost:8080/");
        System.out.println("  GET  http://localhost:8080/users");
        System.out.println("  POST http://localhost:8080/users");
        System.out.println("  GET  http://localhost:8080/error");
        System.out.println("  GET  http://localhost:8080/slow?delay=3");
        
        System.out.println("Server started on port 8080");
    }
    
    private static boolean isJavaVersionSupported() {
        String version = System.getProperty("java.version");
        if (version.startsWith("1.")) {
            version = version.substring(2, 3);
        } else {
            int dot = version.indexOf(".");
            if (dot != -1) {
                version = version.substring(0, dot);
            }
        }
        return Integer.parseInt(version) >= 11;
    }
    
    // Base handler with CORS support
    static abstract class BaseHandler implements HttpHandler {
        protected void setCorsHeaders(HttpExchange exchange) {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
            exchange.getResponseHeaders().add("Content-Type", "application/json");
        }
        
        protected void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
            setCorsHeaders(exchange);
            byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(statusCode, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        }
        
        protected String readRequestBody(HttpExchange exchange) throws IOException {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    body.append(line);
                }
                return body.toString();
            }
        }
    }
    
    // Home handler
    static class HomeHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                sendResponse(exchange, 200, "");
                return;
            }
            
            ObjectNode response = mapper.createObjectNode();
            response.put("message", "Welcome to VLogger Java Example API");
            response.put("timestamp", Instant.now().toString());
            response.put("java_version", System.getProperty("java.version"));
            
            ArrayNode endpoints = mapper.createArrayNode();
            endpoints.add("GET /");
            endpoints.add("GET /users");
            endpoints.add("POST /users");
            endpoints.add("GET /users/{id}");
            endpoints.add("PUT /users/{id}");
            endpoints.add("DELETE /users/{id}");
            endpoints.add("POST /login");
            endpoints.add("GET /error");
            endpoints.add("GET /slow");
            endpoints.add("GET /health");
            response.set("endpoints", endpoints);
            
            sendResponse(exchange, 200, mapper.writeValueAsString(response));
        }
    }
    
    // Users handler
    static class UsersHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                sendResponse(exchange, 200, "");
                return;
            }
            
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();
            
            if (path.equals("/users")) {
                if ("GET".equals(method)) {
                    handleGetUsers(exchange);
                } else if ("POST".equals(method)) {
                    handleCreateUser(exchange);
                } else {
                    sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                }
            } else if (path.startsWith("/users/")) {
                String[] parts = path.split("/");
                if (parts.length == 3) {
                    try {
                        int userId = Integer.parseInt(parts[2]);
                        handleUserById(exchange, userId, method);
                    } catch (NumberFormatException e) {
                        sendResponse(exchange, 400, "{\"error\":\"Invalid user ID\"}");
                    }
                } else {
                    sendResponse(exchange, 404, "{\"error\":\"Not found\"}");
                }
            }
        }
        
        private void handleGetUsers(HttpExchange exchange) throws IOException {
            ObjectNode response = mapper.createObjectNode();
            ArrayNode usersArray = mapper.createArrayNode();
            
            for (User user : users.values()) {
                ObjectNode userNode = mapper.createObjectNode();
                userNode.put("id", user.getId());
                userNode.put("name", user.getName());
                userNode.put("email", user.getEmail());
                usersArray.add(userNode);
            }
            
            response.set("users", usersArray);
            response.put("total", users.size());
            
            sendResponse(exchange, 200, mapper.writeValueAsString(response));
        }
        
        private void handleCreateUser(HttpExchange exchange) throws IOException {
            String body = readRequestBody(exchange);
            
            try {
                ObjectNode input = (ObjectNode) mapper.readTree(body);
                String name = input.get("name").asText();
                String email = input.get("email").asText();
                
                if (name.isEmpty() || email.isEmpty()) {
                    sendResponse(exchange, 400, "{\"error\":\"Name and email are required\"}");
                    return;
                }
                
                int id = userIdCounter.getAndIncrement();
                User newUser = new User(id, name, email);
                users.put(id, newUser);
                
                ObjectNode response = mapper.createObjectNode();
                response.put("id", newUser.getId());
                response.put("name", newUser.getName());
                response.put("email", newUser.getEmail());
                
                sendResponse(exchange, 201, mapper.writeValueAsString(response));
            } catch (Exception e) {
                sendResponse(exchange, 400, "{\"error\":\"Invalid JSON\"}");
            }
        }
        
        private void handleUserById(HttpExchange exchange, int userId, String method) throws IOException {
            User user = users.get(userId);
            
            if (user == null) {
                sendResponse(exchange, 404, "{\"error\":\"User not found\",\"id\":" + userId + "}");
                return;
            }
            
            switch (method) {
                case "GET":
                    ObjectNode response = mapper.createObjectNode();
                    response.put("id", user.getId());
                    response.put("name", user.getName());
                    response.put("email", user.getEmail());
                    sendResponse(exchange, 200, mapper.writeValueAsString(response));
                    break;
                    
                case "PUT":
                    String body = readRequestBody(exchange);
                    try {
                        ObjectNode input = (ObjectNode) mapper.readTree(body);
                        if (input.has("name")) {
                            user.setName(input.get("name").asText());
                        }
                        if (input.has("email")) {
                            user.setEmail(input.get("email").asText());
                        }
                        
                        ObjectNode updateResponse = mapper.createObjectNode();
                        updateResponse.put("id", user.getId());
                        updateResponse.put("name", user.getName());
                        updateResponse.put("email", user.getEmail());
                        sendResponse(exchange, 200, mapper.writeValueAsString(updateResponse));
                    } catch (Exception e) {
                        sendResponse(exchange, 400, "{\"error\":\"Invalid JSON\"}");
                    }
                    break;
                    
                case "DELETE":
                    users.remove(userId);
                    sendResponse(exchange, 204, "");
                    break;
                    
                default:
                    sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    break;
            }
        }
    }
    
    // Login handler
    static class LoginHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                sendResponse(exchange, 200, "");
                return;
            }
            
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }
            
            String body = readRequestBody(exchange);
            
            try {
                ObjectNode input = (ObjectNode) mapper.readTree(body);
                String email = input.get("email").asText();
                String password = input.get("password").asText();
                
                if (email.isEmpty() || password.isEmpty()) {
                    sendResponse(exchange, 400, "{\"error\":\"Email and password are required\"}");
                    return;
                }
                
                // Mock authentication
                if ("john@example.com".equals(email) && "password".equals(password)) {
                    ObjectNode response = mapper.createObjectNode();
                    response.put("message", "Login successful");
                    
                    ObjectNode userNode = mapper.createObjectNode();
                    userNode.put("id", 1);
                    userNode.put("name", "John Doe");
                    userNode.put("email", "john@example.com");
                    response.set("user", userNode);
                    
                    response.put("token", "mock-jwt-token-" + System.currentTimeMillis());
                    
                    sendResponse(exchange, 200, mapper.writeValueAsString(response));
                } else {
                    sendResponse(exchange, 401, "{\"error\":\"Invalid credentials\"}");
                }
            } catch (Exception e) {
                sendResponse(exchange, 400, "{\"error\":\"Invalid JSON\"}");
            }
        }
    }
    
    // Error handler
    static class ErrorHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            throw new RuntimeException("This is a test error for VLogger");
        }
    }
    
    // Slow handler
    static class SlowHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                sendResponse(exchange, 200, "");
                return;
            }
            
            String query = exchange.getRequestURI().getQuery();
            int delay = 2; // Default delay
            
            if (query != null && query.contains("delay=")) {
                try {
                    String delayStr = query.split("delay=")[1].split("&")[0];
                    delay = Math.max(1, Math.min(10, Integer.parseInt(delayStr)));
                } catch (Exception e) {
                    delay = 2;
                }
            }
            
            try {
                Thread.sleep(delay * 1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            
            ObjectNode response = mapper.createObjectNode();
            response.put("message", "Slow response completed");
            response.put("delay", delay + " seconds");
            
            sendResponse(exchange, 200, mapper.writeValueAsString(response));
        }
    }
    
    // Health handler
    static class HealthHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                sendResponse(exchange, 200, "");
                return;
            }
            
            Runtime runtime = Runtime.getRuntime();
            
            ObjectNode response = mapper.createObjectNode();
            response.put("status", "healthy");
            response.put("timestamp", Instant.now().toString());
            response.put("java_version", System.getProperty("java.version"));
            response.put("memory_usage", runtime.totalMemory() - runtime.freeMemory());
            response.put("memory_total", runtime.totalMemory());
            response.put("memory_max", runtime.maxMemory());
            
            sendResponse(exchange, 200, mapper.writeValueAsString(response));
        }
    }
    
    // User class
    static class User {
        private int id;
        private String name;
        private String email;
        
        public User(int id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }
        
        public int getId() { return id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        
        public void setName(String name) { this.name = name; }
        public void setEmail(String email) { this.email = email; }
    }
}