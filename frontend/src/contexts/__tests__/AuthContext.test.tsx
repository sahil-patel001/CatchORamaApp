import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import * as authService from "@/services/authService";
import { vi } from "vitest";

// Mock the authService
vi.mock("@/services/authService");

const mockUser = {
  id: "1",
  name: "Test User",
  email: "test@example.com",
  role: "vendor",
};

const TestComponent = () => {
  const { user, login, signup, logout, isLoading } = useAuth();
  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {user && <p>Welcome, {user.name}</p>}
      <button onClick={() => login("test@example.com", "password")}>
        Login
      </button>
      <button
        onClick={() => signup("Test User", "test@example.com", "password")}
      >
        Signup
      </button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should handle successful login", async () => {
    (authService.login as vi.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUser },
    });
    (authService.getMe as vi.Mock).mockResolvedValue({ success: false }); // Start as not logged in

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state
    expect(screen.queryByText("Welcome, Test User")).toBeNull();

    // Perform login
    await act(async () => {
      screen.getByText("Login").click();
    });

    // Check for user
    expect(await screen.findByText("Welcome, Test User")).toBeInTheDocument();
  });

  it("should handle failed login", async () => {
    (authService.login as vi.Mock).mockResolvedValue({
      success: false,
      message: "Invalid credentials",
    });
    (authService.getMe as vi.Mock).mockResolvedValue({ success: false });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Login").click();
    });

    expect(screen.queryByText("Welcome, Test User")).toBeNull();
  });

  it("should handle successful signup", async () => {
    (authService.signup as vi.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUser },
    });
    (authService.getMe as vi.Mock).mockResolvedValue({ success: false });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Signup").click();
    });

    expect(await screen.findByText("Welcome, Test User")).toBeInTheDocument();
  });

  it("should handle logout", async () => {
    (authService.getMe as vi.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUser },
    });
    (authService.logout as vi.Mock).mockResolvedValue({ success: true });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially logged in
    expect(await screen.findByText("Welcome, Test User")).toBeInTheDocument();

    // Perform logout
    await act(async () => {
      screen.getByText("Logout").click();
    });

    expect(screen.queryByText("Welcome, Test User")).toBeNull();
  });

  it("should check for authenticated user on mount", async () => {
    (authService.getMe as vi.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUser },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(await screen.findByText("Welcome, Test User")).toBeInTheDocument();
  });
});
