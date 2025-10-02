import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Shield, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { login, signup, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth error messages from URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      let errorMessage = '';
      switch (error) {
        case 'oauth_not_configured':
          errorMessage = 'Google OAuth is not configured on this server. Please contact support or use email/password login.';
          break;
        case 'oauth_failed':
          errorMessage = 'Google authentication failed. Please try again.';
          break;
        case 'oauth_error':
          errorMessage = 'An error occurred during Google authentication. Please try again.';
          break;
        default:
          errorMessage = 'Authentication error occurred. Please try again.';
      }
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Clear the error from URL
      navigate('/login', { replace: true });
    }
  }, [searchParams, toast, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      if (!name) {
        toast({
          title: "Name required",
          description: "Please enter your full name.",
          variant: "destructive",
        });
        return;
      }
      const res = await signup(name, email, password);
      if (res.success) {
        toast({
          title: "Signup successful",
          description: "Account created and logged in!",
        });
      } else {
        toast({
          title: "Signup failed",
          description: res.error || "Could not create account.",
          variant: "destructive",
        });
      }
      return;
    }
    const res = await login(email, password);
    if (res.success) {
      toast({
        title: "Login successful",
        description: "Welcome to the admin panel!",
      });
    } else {
      toast({
        title: "Login failed",
        description: res.error || "Invalid credentials.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground items-center justify-center p-12">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bricolage font-bold">Admin Panel</h1>
          <p className="text-xl font-manrope opacity-90">
            Streamline your business operations with our comprehensive vendor
            management platform
          </p>
          <div className="space-y-4 text-sm font-manrope opacity-75">
            <p>✓ Complete inventory management</p>
            <p>✓ Real-time sales analytics</p>
            <p>✓ Order tracking & management</p>
            <p>✓ Multi-vendor ecosystem</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bricolage font-bold text-center">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <p className="text-muted-foreground text-center font-manrope">
              {isSignUp
                ? "Sign up to start managing your business"
                : "Enter your credentials to access your account"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth Button */}
            <Button
              variant="outline"
              className="w-full font-manrope"
              onClick={async () => {
                try {
                  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/v1";
                  
                  // First check if Google OAuth is configured
                  const response = await fetch(`${apiUrl}/auth/google`, {
                    method: 'GET',
                    redirect: 'manual' // Don't follow redirects automatically
                  });
                  
                  if (response.status === 503) {
                    // OAuth not configured
                    toast({
                      title: "Google OAuth Unavailable",
                      description: "Google authentication is not configured. Please use email/password login.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // If we get here, OAuth should be configured, proceed with redirect
                  window.location.href = `${apiUrl}/auth/google`;
                } catch (error) {
                  toast({
                    title: "Connection Error",
                    description: "Unable to connect to authentication service. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              type="button"
              disabled={isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-manrope">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="font-manrope"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-manrope">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="font-manrope"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-manrope">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="font-manrope pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full font-manrope"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : null}
                {isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                className="font-manrope"
                onClick={() => setIsSignUp(!isSignUp)}
                type="button"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
