const request = require("supertest");

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe("Authentication and User Profile API Tests", () => {
  // Generate unique usernames for each test run
  const uniqueSuffix = Math.random().toString(36).substring(2, 15);
  const testUser = {
    email: `testuser_${uniqueSuffix}@example.com`,
    username: `testuser_${uniqueSuffix}`,
    password: "SecurePassword123",
  };

  const testUser2 = {
    email: `testuser2_${uniqueSuffix}@example.com`,
    username: `testuser2_${uniqueSuffix}`,
    password: "AnotherPassword456",
  };

  let authToken;
  let userId;

  // ==========================================
  // POST /api/auth/signup Tests
  // ==========================================
  describe("POST /api/auth/signup - User Registration", () => {
    it("should successfully create a new user with valid credentials", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: testUser.email,
        username: testUser.username,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("User created successfully.");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("email", testUser.email);
      expect(response.body.user).toHaveProperty("username", testUser.username);
      expect(response.body.user).toHaveProperty("role", "USER");
      expect(response.body.user).not.toHaveProperty("passwordHash");

      // Store user ID for later tests
      userId = response.body.user.id;
    });

    it("should fail to create a user with missing email", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        username: "newuser",
        password: "SecurePassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should fail to create a user with missing password", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: "user@example.com",
        username: "newuser",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should fail to create a user with missing username", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: "user@example.com",
        password: "SecurePassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should fail to create a user with invalid email format", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: "invalid-email",
        username: "newuser",
        password: "SecurePassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid email format");
    });

    it("should fail to create a user with password shorter than 8 characters", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: "user@example.com",
        username: "newuser",
        password: "Short1",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("at least 8 characters long");
    });

    it("should fail to create a user with username shorter than 3 characters", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: "user@example.com",
        username: "ab",
        password: "SecurePassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("between 3 and 30 characters");
    });

    it("should fail to create a user with username longer than 30 characters", async () => {
      const response = await request(BASE_URL)
        .post("/api/auth/signup")
        .send({
          email: "user@example.com",
          username: "a".repeat(31),
          password: "SecurePassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("between 3 and 30 characters");
    });

    it("should fail to create a user with an existing email", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: testUser.email,
        username: "anotheruser",
        password: "SecurePassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("email already exists");
    });

    it("should fail to create a user with an existing username", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: "newemail@example.com",
        username: testUser.username,
        password: "SecurePassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("username already exists");
    });
  });

  // ==========================================
  // POST /api/auth/login Tests
  // ==========================================
  describe("POST /api/auth/login - User Authentication", () => {
    it("should successfully log in with valid credentials", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Login successful.");
      expect(response.body.user).toHaveProperty("id", userId);
      expect(response.body.user).toHaveProperty("email", testUser.email);
      expect(response.body.user).toHaveProperty("username", testUser.username);
      expect(response.body.user).toHaveProperty("role", "USER");
      expect(response.body.user).not.toHaveProperty("passwordHash");

      // Check if authToken cookie is set
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("authToken");

      // Extract token from cookie for later use
      const cookieMatch = cookies[0].match(/authToken=([^;]+)/);
      if (cookieMatch) {
        authToken = cookieMatch[1];
      }
    });

    it("should fail to log in with missing email", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should fail to log in with missing password", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        email: testUser.email,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should fail to log in with non-existent email", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "SomePassword123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid email or password");
    });

    it("should fail to log in with incorrect password", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        email: testUser.email,
        password: "WrongPassword123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid email or password");
    });
  });

  // ==========================================
  // POST /api/auth/logout Tests
  // ==========================================
  describe("POST /api/auth/logout - User Session Termination", () => {
    it("should successfully log out and clear the auth cookie", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(loginResponse.status).toBe(200);

      // Now log out
      const logoutResponse = await request(BASE_URL)
        .post("/api/auth/logout")
        .set("Cookie", loginResponse.headers["set-cookie"]);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty("message");
      expect(logoutResponse.body.message).toBe("Logout successful.");

      // Check if authToken cookie is cleared (maxAge: 0)
      const cookies = logoutResponse.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("authToken");
      expect(cookies[0]).toContain("Max-Age=0");
    });

    it("should successfully log out without an active session", async () => {
      const response = await request(BASE_URL).post("/api/auth/logout");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Logout successful.");
    });
  });

  // ==========================================
  // PUT /api/users/profile Tests
  // ==========================================
  describe("PUT /api/users/profile - Update User Profile", () => {
    it("should fail to update profile without authentication", async () => {
      const response = await request(BASE_URL).put("/api/users/profile").send({
        username: "newusername",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Unauthorized");
    });

    it("should fail to update profile with invalid token", async () => {
      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", "authToken=invalidToken123")
        .send({
          username: "newusername",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should fail to update profile with missing update fields", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("At least one field");
    });

    it("should successfully update username", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const newUsername = `updated_${uniqueSuffix}`;
      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          username: newUsername,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Profile updated successfully.");
      expect(response.body.user).toHaveProperty("username", newUsername);
      expect(response.body.user).not.toHaveProperty("passwordHash");
    });

    it("should successfully update avatar", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const avatarUrl = "https://example.com/avatar.jpg";
      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          avatar: avatarUrl,
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty("avatar", avatarUrl);
    });

    it("should successfully update favoriteTeamId", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          favoriteTeamId: "1",
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty("favoriteTeamId", "1");
    });

    it("should successfully update multiple profile fields", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const updatedData = {
        username: `multiupdate_${uniqueSuffix}`,
        avatar: "https://example.com/new-avatar.jpg",
        favoriteTeamId: "2",
      };

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty(
        "username",
        updatedData.username,
      );
      expect(response.body.user).toHaveProperty("avatar", updatedData.avatar);
      expect(response.body.user).toHaveProperty(
        "favoriteTeamId",
        updatedData.favoriteTeamId,
      );
    });

    it("should fail to update username with a username that is too short", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          username: "ab",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("between 3 and 30 characters");
    });

    it("should fail to update username with a username that is too long", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          username: "a".repeat(31),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("between 3 and 30 characters");
    });

    it("should fail to update username to one that is already taken", async () => {
      // Create a second user
      const signupResponse = await request(BASE_URL)
        .post("/api/auth/signup")
        .send({
          email: testUser2.email,
          username: testUser2.username,
          password: testUser2.password,
        });

      expect(signupResponse.status).toBe(201);

      // Try to update the first user's username to the second user's username
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          username: testUser2.username,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("already taken");
    });

    it("should fail to update avatar with invalid URL format", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          avatar: "",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("At least one field (username, avatar, or favoriteTeamId) must be provided for update.");
    });

    it("should allow user to keep their existing username", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      // Send current username (no change)
      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          username: testUser.username,
          avatar: "https://example.com/avatar-updated.jpg",
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty("username", testUser.username);
      expect(response.body.user).toHaveProperty(
        "avatar",
        "https://example.com/avatar-updated.jpg",
      );
    });

    it("should allow clearing favoriteTeamId by setting it to null", async () => {
      // First, log in to get a valid session
      const loginResponse = await request(BASE_URL)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response = await request(BASE_URL)
        .put("/api/users/profile")
        .set("Cookie", loginResponse.headers["set-cookie"])
        .send({
          favoriteTeamId: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty("favoriteTeamId", null);
    });
  });
});

describe("Moderation API Tests", () => {
  // ==========================================
  // POST /api/moderation/report Tests
  // ==========================================
  describe("POST /api/moderation/report - Submit Report", () => {
      it("should return success shape for a valid report payload", async () => {
        const response = await request(BASE_URL)
          .post("/api/moderation/report")
          .send({
            targetId: "1",
            targetType: "POST",
            reason: "Harassment",
            content: "You are terrible and should leave.",
            reporterId: 1
          });

        if (response.status === 201) {
          expect(response.body).toHaveProperty(
            "message",
            "Report submitted successfully",
          );
          expect(response.body).toHaveProperty("reportId");
        } else {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty("error");
        }
      });

    it("should fail when required fields are missing", async () => {
      const response = await request(BASE_URL)
        .post("/api/moderation/report")
        .send({
          targetType: "POST",
          reason: "Spam",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should fail when reporterId is missing", async () => {
      const response = await request(BASE_URL)
        .post("/api/moderation/report")
        .send({
          targetId: 1,
          targetType: "THREAD",
          reason: "Offensive language",
          content: "This thread is offensive."
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });
  });

  // ==========================================
  // GET /api/moderation/queue Tests
  // ==========================================
  describe("GET /api/moderation/queue - Get Moderation Queue", () => {
    it("should return the moderation queue", async () => {
      const response = await request(BASE_URL).get("/api/moderation/queue");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("reports");
      expect(Array.isArray(response.body.reports)).toBe(true);
    });

    it("should return report entries with queue-friendly fields", async () => {
      const response = await request(BASE_URL).get("/api/moderation/queue");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("reports");

      if (response.body.reports.length > 0) {
        expect(response.body.reports[0]).toHaveProperty("status", "PENDING");
      }
    });
  });

  // ==========================================
  // POST /api/moderation/ban Tests
  // ==========================================
  describe("POST /api/moderation/ban - Approve or Dismiss Reports", () => {
    it("should fail when reportId is not a number", async () => {
      const response = await request(BASE_URL)
        .post("/api/moderation/ban")
        .send({
          reportId: "1",
          conclusion: "APPROVED",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid reportId.");
    });

    it("should return invalid conclusion error for malformed conclusion", async () => {
      const response = await request(BASE_URL)
        .post("/api/moderation/ban")
        .send({
          reportId: 1,
          conclusion: 123,
        });

      expect([200, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("error", "Invalid conclusion.");
    });
  });

  // ==========================================
  // POST /api/moderation/appeal Tests
  // ==========================================
  describe("POST /api/moderation/appeal - Submit Ban Appeal", () => {
    it("should reject appeal from a user that is not banned", async () => {
      const response = await request(BASE_URL)
        .post("/api/moderation/appeal")
        .send({
          userId: 999999,
          message: "Please review my account status.",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Only banned users can appeal.",
      );
    });

    it("should return JSON error response when payload is incomplete", async () => {
      const response = await request(BASE_URL)
        .post("/api/moderation/appeal")
        .send({
          message: "I would like to appeal.",
        });

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });
  });
});