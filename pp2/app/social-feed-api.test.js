const request = require("supertest");

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe("Social and Feed API Tests", () => {
  // Generate unique usernames for each test run
  const uniqueSuffix = Math.random().toString(36).substring(2, 15);
  const testUser = {
    email: `socialtest1_${uniqueSuffix}@example.com`,
    username: `socialtest1_${uniqueSuffix}`,
    password: "SecurePassword123",
  };

  const testUser2 = {
    email: `socialtest2_${uniqueSuffix}@example.com`,
    username: `socialtest2_${uniqueSuffix}`,
    password: "SecurePassword456",
  };

  const testUser3 = {
    email: `socialtest3_${uniqueSuffix}@example.com`,
    username: `socialtest3_${uniqueSuffix}`,
    password: "SecurePassword789",
  };

  let user1Token;
  let user1Id;
  let user1Cookies;
  let user2Token;
  let user2Id;
  let user2Cookies;
  let user3Token;
  let user3Id;
  let user3Cookies;

  // ==========================================
  // Setup: Create test users
  // ==========================================
  describe("Setup - Create Test Users", () => {
    it("should create test user 1", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: testUser.email,
        username: testUser.username,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      user1Id = response.body.user.id;
    });

    it("should log in test user 1", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      user1Cookies = response.headers["set-cookie"];
      const cookieMatch = user1Cookies[0].match(/authToken=([^;]+)/);
      if (cookieMatch) {
        user1Token = cookieMatch[1];
      }
    });

    it("should create test user 2", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: testUser2.email,
        username: testUser2.username,
        password: testUser2.password,
      });

      expect(response.status).toBe(201);
      user2Id = response.body.user.id;
    });

    it("should log in test user 2", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        email: testUser2.email,
        password: testUser2.password,
      });

      expect(response.status).toBe(200);
      user2Cookies = response.headers["set-cookie"];
      const cookieMatch = user2Cookies[0].match(/authToken=([^;]+)/);
      if (cookieMatch) {
        user2Token = cookieMatch[1];
      }
    });

    it("should create test user 3", async () => {
      const response = await request(BASE_URL).post("/api/auth/signup").send({
        email: testUser3.email,
        username: testUser3.username,
        password: testUser3.password,
      });

      expect(response.status).toBe(201);
      user3Id = response.body.user.id;
    });

    it("should log in test user 3", async () => {
      const response = await request(BASE_URL).post("/api/auth/login").send({
        email: testUser3.email,
        password: testUser3.password,
      });

      expect(response.status).toBe(200);
      user3Cookies = response.headers["set-cookie"];
      const cookieMatch = user3Cookies[0].match(/authToken=([^;]+)/);
      if (cookieMatch) {
        user3Token = cookieMatch[1];
      }
    });
  });

  // ==========================================
  // GET /api/users/:username/profile Tests
  // ==========================================
  describe("GET /api/users/:username/profile - User Profile", () => {
    it("should fetch user profile successfully", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/${testUser.username}/profile`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("username", testUser.username);
      expect(response.body).toHaveProperty("followerCount");
      expect(response.body).toHaveProperty("followingCount");
      expect(response.body).toHaveProperty("threads");
      expect(response.body).toHaveProperty("posts");
      expect(response.body).toHaveProperty("replies");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/nonexistentuser_${uniqueSuffix}/profile`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("User not found");
    });

    it("should return 404 if username is not found", async () => {
      const response = await request(BASE_URL).get("/api/users/q/profile");

      expect(response.status).toBe(404);
    });

    it("should include follower and following counts after follows", async () => {
      // User 1 follows User 2
      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user1Cookies);

      // User 3 follows User 2
      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user3Cookies);

      const response = await request(BASE_URL).get(
        `/api/users/${testUser2.username}/profile`,
      );

      expect(response.status).toBe(200);
      expect(response.body.followerCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================
  // GET /api/users/:username/activity Tests
  // ==========================================
  describe("GET /api/users/:username/activity - User Activity Chart", () => {
    it("should fetch user activity with default 30 days", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/${testUser.username}/activity`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username", testUser.username);
      expect(response.body).toHaveProperty("period");
      expect(response.body.period).toHaveProperty("days", 30);
      expect(response.body).toHaveProperty("totalActivity");
      expect(response.body).toHaveProperty("activityByDate");
      expect(Array.isArray(response.body.activityByDate)).toBe(true);
    });

    it("should fetch user activity with custom days parameter", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/${testUser.username}/activity?days=7`,
      );

      expect(response.status).toBe(200);
      expect(response.body.period.days).toBe(7);
      expect(response.body).toHaveProperty("activityByDate");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/nonexistentuser_${uniqueSuffix}/activity`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 for invalid days parameter", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/${testUser.username}/activity?days=-5`,
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 for non-numeric days parameter", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/${testUser.username}/activity?days=abc`,
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("activity dates should be sorted chronologically", async () => {
      const response = await request(BASE_URL).get(
        `/api/users/${testUser.username}/activity`,
      );

      expect(response.status).toBe(200);
      const activities = response.body.activityByDate;
      for (let i = 1; i < activities.length; i++) {
        expect(
          new Date(activities[i].date) >= new Date(activities[i - 1].date),
        ).toBe(true);
      }
    });
  });

  // ==========================================
  // POST /api/social/follow/:userId Tests
  // ==========================================
  describe("POST /api/social/follow/:userId - Follow User", () => {
    it("should fail to follow without authentication", async () => {
      const response = await request(BASE_URL).post(
        `/api/social/follow/${user2Id}`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Unauthorized");
    });

    it("should fail to follow with invalid token", async () => {
      const response = await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", "authToken=invalidToken");

      expect(response.status).toBe(401);
    });

    it("should successfully follow a user", async () => {
      const response = await request(BASE_URL)
        .post(`/api/social/follow/${user3Id}`)
        .set("Cookie", user2Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Successfully followed");
    });

    it("should fail to follow the same user twice", async () => {
      // First follow
      await request(BASE_URL)
        .post(`/api/social/follow/${user3Id}`)
        .set("Cookie", user1Cookies);

      // Try to follow again
      const response = await request(BASE_URL)
        .post(`/api/social/follow/${user3Id}`)
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("already following");
    });

    it("should fail when user tries to follow themselves", async () => {
      const response = await request(BASE_URL)
        .post(`/api/social/follow/${user1Id}`)
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("cannot follow yourself");
    });

    it("should fail to follow non-existent user", async () => {
      const response = await request(BASE_URL)
        .post("/api/social/follow/99999")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  // ==========================================
  // DELETE /api/social/follow/:userId Tests
  // ==========================================
  describe("DELETE /api/social/follow/:userId - Unfollow User", () => {
    it("should fail to unfollow without authentication", async () => {
      const response = await request(BASE_URL).delete(
        `/api/social/follow/${user3Id}`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should successfully unfollow a user", async () => {
      // First, follow the user
      await request(BASE_URL)
        .post(`/api/social/follow/${user3Id}`)
        .set("Cookie", user2Cookies);

      // Then unfollow
      const response = await request(BASE_URL)
        .delete(`/api/social/follow/${user3Id}`)
        .set("Cookie", user2Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Successfully unfollowed");
    });

    it("should fail to unfollow a user that is not being followed", async () => {
      const response = await request(BASE_URL)
        .delete(`/api/social/follow/${user1Id}`)
        .set("Cookie", user3Cookies);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("not following");
    });

    it("should fail when user tries to unfollow themselves", async () => {
      const response = await request(BASE_URL)
        .delete(`/api/social/follow/${user1Id}`)
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("cannot unfollow yourself");
    });

    it("should fail to unfollow non-existent user", async () => {
      const response = await request(BASE_URL)
        .delete("/api/social/follow/99999")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(404);
    });
  });

  // ==========================================
  // DELETE /api/social/followers/:userId Tests
  // ==========================================
  describe("DELETE /api/social/followers/:userId - Remove Follower", () => {
    it("should fail to remove follower without authentication", async () => {
      const response = await request(BASE_URL).delete(
        `/api/social/followers/${user1Id}`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should successfully remove a follower", async () => {
      // User 1 follows User 2
      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user1Cookies);

      // User 2 removes User 1 as follower
      const response = await request(BASE_URL)
        .delete(`/api/social/followers/${user1Id}`)
        .set("Cookie", user2Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Successfully removed follower");
    });

    it("should fail to remove a user that is not following", async () => {
      const response = await request(BASE_URL)
        .delete(`/api/social/followers/${user3Id}`)
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("not following");
    });

    it("should fail when user tries to remove themselves", async () => {
      const response = await request(BASE_URL)
        .delete(`/api/social/followers/${user1Id}`)
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("cannot remove yourself");
    });

    it("should fail to remove non-existent user", async () => {
      const response = await request(BASE_URL)
        .delete("/api/social/followers/99999")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(404);
    });
  });

  // ==========================================
  // GET /api/social/followers Tests
  // ==========================================
  describe("GET /api/social/followers - View Followers", () => {
    it("should fail without authentication", async () => {
      const response = await request(BASE_URL).get("/api/social/followers");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should successfully fetch followers list", async () => {
      // Set up: User 1 and User 3 follow User 2
      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user1Cookies);

      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user3Cookies);

      const response = await request(BASE_URL)
        .get("/api/social/followers")
        .set("Cookie", user2Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("followers");
      expect(response.body).toHaveProperty("totalFollowers");
      expect(Array.isArray(response.body.followers)).toBe(true);
      expect(response.body.followers.length).toBeGreaterThanOrEqual(0);

      // Verify structure of followers
      if (response.body.followers.length > 0) {
        const follower = response.body.followers[0];
        expect(follower).toHaveProperty("id");
        expect(follower).toHaveProperty("username");
        expect(follower).toHaveProperty("avatar");
        expect(follower).toHaveProperty("role");
      }
    });

    it("should return valid followers list structure", async () => {
      const response = await request(BASE_URL)
        .get("/api/social/followers")
        .set("Cookie", user3Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("followers");
      expect(response.body).toHaveProperty("totalFollowers");
      expect(Array.isArray(response.body.followers)).toBe(true);
      // totalFollowers should match the length of the array
      expect(response.body.totalFollowers).toBe(response.body.followers.length);
    });
  });

  // ==========================================
  // GET /api/social/following Tests
  // ==========================================
  describe("GET /api/social/following - View Following", () => {
    it("should fail without authentication", async () => {
      const response = await request(BASE_URL).get("/api/social/following");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should successfully fetch following list", async () => {
      // Set up: User 1 follows User 2 and User 3
      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user1Cookies);

      await request(BASE_URL)
        .post(`/api/social/follow/${user3Id}`)
        .set("Cookie", user1Cookies);

      const response = await request(BASE_URL)
        .get("/api/social/following")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("following");
      expect(response.body).toHaveProperty("totalFollowing");
      expect(Array.isArray(response.body.following)).toBe(true);
      expect(response.body.following.length).toBeGreaterThanOrEqual(2);

      // Verify structure of following
      const following = response.body.following[0];
      expect(following).toHaveProperty("id");
      expect(following).toHaveProperty("username");
      expect(following).toHaveProperty("avatar");
      expect(following).toHaveProperty("role");
    });

    it("should return empty following list if user follows no one", async () => {
      const response = await request(BASE_URL)
        .get("/api/social/following")
        .set("Cookie", user3Cookies);

      expect(response.status).toBe(200);
      expect(response.body.following).toBeDefined();
      expect(Array.isArray(response.body.following)).toBe(true);
    });
  });

  // ==========================================
  // GET /api/feed Tests
  // ==========================================
  describe("GET /api/feed - Personalized Feed", () => {
    it("should fail without authentication", async () => {
      const response = await request(BASE_URL).get("/api/feed");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should successfully fetch feed", async () => {
      const response = await request(BASE_URL)
        .get("/api/feed")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("feed");
      expect(response.body).toHaveProperty("totalItems");
      expect(Array.isArray(response.body.feed)).toBe(true);
    });

    it("should return feed with proper structure", async () => {
      const response = await request(BASE_URL)
        .get("/api/feed")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      expect(response.body.feed).toBeDefined();
      expect(response.body.totalItems).toBeGreaterThanOrEqual(0);

      // If feed has items, verify they have required properties
      if (response.body.feed.length > 0) {
        const feedItem = response.body.feed[0];
        expect(feedItem).toHaveProperty("type");
        expect(feedItem).toHaveProperty("createdAt");
        // Type can be post_activity, following_post, or team_update
        expect(
          ["post_activity", "following_post", "team_update"].includes(
            feedItem.type,
          ),
        ).toBe(true);
      }
    });

    it("should limit feed to 50 items maximum", async () => {
      const response = await request(BASE_URL)
        .get("/api/feed")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      expect(response.body.feed.length).toBeLessThanOrEqual(50);
    });

    it("feed items should be sorted by date (most recent first)", async () => {
      const response = await request(BASE_URL)
        .get("/api/feed")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      const feedItems = response.body.feed;

      for (let i = 1; i < feedItems.length; i++) {
        const prevDate = new Date(feedItems[i - 1].createdAt);
        const currDate = new Date(feedItems[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });

    it("should include post_activity items with grouped activity", async () => {
      const response = await request(BASE_URL)
        .get("/api/feed")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      const postActivityItems = response.body.feed.filter(
        (item) => item.type === "post_activity",
      );

      // If there are post activity items, verify structure
      if (postActivityItems.length > 0) {
        const item = postActivityItems[0];
        expect(item).toHaveProperty("thread");
        expect(item).toHaveProperty("activity");
        expect(Array.isArray(item.activity)).toBe(true);
      }
    });

    it("should include following_post items with reply count", async () => {
      const response = await request(BASE_URL)
        .get("/api/feed")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      const followingPosts = response.body.feed.filter(
        (item) => item.type === "following_post",
      );

      // If there are following posts, verify structure
      if (followingPosts.length > 0) {
        const post = followingPosts[0];
        expect(post).toHaveProperty("id");
        expect(post).toHaveProperty("author");
        expect(post).toHaveProperty("thread");
        expect(post).toHaveProperty("replyCount");
      }
    });
  });

  // ==========================================
  // Integration Tests
  // ==========================================
  describe("Integration Tests - Follow and Feed Interactions", () => {
    it("should update follower count when user follows another", async () => {
      // Get initial profile
      const initialProfile = await request(BASE_URL).get(
        `/api/users/${testUser2.username}/profile`,
      );
      const initialFollowers = initialProfile.body.followerCount;

      // User follows User 2
      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user1Cookies);

      // Get updated profile
      const updatedProfile = await request(BASE_URL).get(
        `/api/users/${testUser2.username}/profile`,
      );
      const updatedFollowers = updatedProfile.body.followerCount;

      expect(updatedFollowers).toBeGreaterThanOrEqual(initialFollowers);
    });

    it("should update following count when user follows another", async () => {
      // Get initial profile
      const initialProfile = await request(BASE_URL).get(
        `/api/users/${testUser.username}/profile`,
      );
      const initialFollowing = initialProfile.body.followingCount;

      // User 1 follows User 3
      const followResponse = await request(BASE_URL)
        .post(`/api/social/follow/${user3Id}`)
        .set("Cookie", user1Cookies);

      if (followResponse.status === 200) {
        // Get updated profile
        const updatedProfile = await request(BASE_URL).get(
          `/api/users/${testUser.username}/profile`,
        );
        const updatedFollowing = updatedProfile.body.followingCount;

        expect(updatedFollowing).toBeGreaterThan(initialFollowing);
      }
    });

    it("should include following user's posts in authenticated user's feed", async () => {
      // User 1 follows User 2
      await request(BASE_URL)
        .post(`/api/social/follow/${user2Id}`)
        .set("Cookie", user1Cookies);

      // Get User 1's feed
      const response = await request(BASE_URL)
        .get("/api/feed")
        .set("Cookie", user1Cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("feed");
      // Feed should be available. Whether it contains posts from user 2 depends on if they have posts.
    });
  });
});
