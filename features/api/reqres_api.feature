# ============================================================================
# 📁 reqres_api.feature — REST API Testing Scenarios
# ============================================================================
#
# WHAT IS THIS FILE?
# Tests a public REST API using CRUD operations (Create, Read, Update, Delete).
# Uses JSONPlaceholder (https://jsonplaceholder.typicode.com), a free fake
# REST API that works reliably without authentication.
#
# API TESTING vs UI TESTING:
#   UI Tests:  Open a browser → click buttons → verify visual output
#   API Tests: Send HTTP requests → verify response data
#
# API tests are MUCH FASTER than UI tests (no browser needed) and test
# the backend logic directly. A good test suite has BOTH types.
#
# TAGS:
#   @api → Marks this as an API test (no browser is launched)
# ============================================================================

@api
Feature: REST API CRUD Operations
  As an API consumer
  I want to perform CRUD operations on a REST API
  So that I can verify the API is working correctly

  # ══════════════════════════════════════════════════════════════════
  # 📖 READ Operations (GET requests)
  # ══════════════════════════════════════════════════════════════════

  @smoke
  Scenario: Get list of users
    When I send a GET request to "/users"
    Then the API response status should be 200

  @regression
  Scenario: Get a single user
    When I send a GET request to "/users/1"
    Then the API response status should be 200
    And the API response field "id" should equal 1

  @regression
  Scenario: Get posts for a user
    When I send a GET request to "/users/1/posts"
    Then the API response status should be 200

  # ══════════════════════════════════════════════════════════════════
  # ✏️ CREATE Operations (POST requests)
  # ══════════════════════════════════════════════════════════════════

  @smoke
  Scenario: Create a new post
    When I send a POST request to "/posts" with body:
      """json
      {
        "title": "My New Post",
        "body": "This is the content of the post.",
        "userId": 1
      }
      """
    Then the API response status should be 201
    And the API response should contain "id"
    And the API response should contain "title"

  # ══════════════════════════════════════════════════════════════════
  # 🔄 UPDATE Operations (PUT requests)
  # ══════════════════════════════════════════════════════════════════

  @regression
  Scenario: Update a post
    When I send a PUT request to "/posts/1" with body:
      """json
      {
        "id": 1,
        "title": "Updated Post Title",
        "body": "Updated content.",
        "userId": 1
      }
      """
    Then the API response status should be 200
    And the API response should contain "Updated Post Title"

  # ══════════════════════════════════════════════════════════════════
  # 🗑️ DELETE Operations (DELETE requests)
  # ══════════════════════════════════════════════════════════════════

  @regression
  Scenario: Delete a post
    When I send a DELETE request to "/posts/1"
    Then the API response status should be 200
