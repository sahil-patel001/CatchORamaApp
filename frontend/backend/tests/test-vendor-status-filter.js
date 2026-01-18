import axios from "axios";

const API_BASE_URL = "http://localhost:5001/api/v1";

// Test credentials
const ADMIN_CREDENTIALS = {
  email: "admin@demo.com",
  password: "admin123",
};

// Create axios instance with cookie support
const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: API_BASE_URL,
});

// Login function
const login = async (credentials) => {
  try {
    const response = await axiosInstance.post("/auth/login", credentials);
    return response.data.token;
  } catch (error) {
    console.error("Login failed:", error.response?.data || error.message);
    throw error;
  }
};

// Test vendor status filtering
const testVendorStatusFilter = async () => {
  try {
    console.log("🧪 Testing Vendor Status Filter...\n");

    // Login as admin
    console.log("1. Logging in as admin...");
    const adminToken = await login(ADMIN_CREDENTIALS);
    console.log("✅ Admin login successful");

    // Test 1: Get all vendors (no status filter)
    console.log('\n2. Testing "all" vendors (no status parameter)...');
    try {
      const allVendorsResponse = await axiosInstance.get("/vendors", {
        params: {
          page: 1,
          limit: 10,
          search: "",
        },
      });
      console.log(
        `✅ All vendors: ${allVendorsResponse.data.data.vendors.length} found`
      );
      console.log(
        "   Vendors:",
        allVendorsResponse.data.data.vendors.map(
          (v) => `${v.businessName} (${v.status})`
        )
      );
    } catch (error) {
      console.error(
        "❌ Failed to get all vendors:",
        error.response?.data || error.message
      );
    }

    // Test 2: Get active vendors only
    console.log('\n3. Testing "active" vendors filter...');
    try {
      const activeVendorsResponse = await axios.get(`${API_BASE_URL}/vendors`, {
        params: {
          page: 1,
          limit: 10,
          search: "",
          status: "active",
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(
        `✅ Active vendors: ${activeVendorsResponse.data.data.vendors.length} found`
      );
      console.log(
        "   Vendors:",
        activeVendorsResponse.data.data.vendors.map(
          (v) => `${v.businessName} (${v.status})`
        )
      );
    } catch (error) {
      console.error(
        "❌ Failed to get active vendors:",
        error.response?.data || error.message
      );
    }

    // Test 3: Get inactive vendors only
    console.log('\n4. Testing "inactive" vendors filter...');
    try {
      const inactiveVendorsResponse = await axios.get(
        `${API_BASE_URL}/vendors`,
        {
          params: {
            page: 1,
            limit: 10,
            search: "",
            status: "inactive",
          },
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      console.log(
        `✅ Inactive vendors: ${inactiveVendorsResponse.data.data.vendors.length} found`
      );
      console.log(
        "   Vendors:",
        inactiveVendorsResponse.data.data.vendors.map(
          (v) => `${v.businessName} (${v.status})`
        )
      );
    } catch (error) {
      console.error(
        "❌ Failed to get inactive vendors:",
        error.response?.data || error.message
      );
    }

    // Test 4: Get pending vendors only
    console.log('\n5. Testing "pending" vendors filter...');
    try {
      const pendingVendorsResponse = await axios.get(
        `${API_BASE_URL}/vendors`,
        {
          params: {
            page: 1,
            limit: 10,
            search: "",
            status: "pending",
          },
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      console.log(
        `✅ Pending vendors: ${pendingVendorsResponse.data.data.vendors.length} found`
      );
      console.log(
        "   Vendors:",
        pendingVendorsResponse.data.data.vendors.map(
          (v) => `${v.businessName} (${v.status})`
        )
      );
    } catch (error) {
      console.error(
        "❌ Failed to get pending vendors:",
        error.response?.data || error.message
      );
    }

    // Test 5: Test with "all" status parameter
    console.log('\n6. Testing "all" status parameter...');
    try {
      const allStatusResponse = await axios.get(`${API_BASE_URL}/vendors`, {
        params: {
          page: 1,
          limit: 10,
          search: "",
          status: "all",
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(
        `✅ All status vendors: ${allStatusResponse.data.data.vendors.length} found`
      );
      console.log(
        "   Vendors:",
        allStatusResponse.data.data.vendors.map(
          (v) => `${v.businessName} (${v.status})`
        )
      );
    } catch (error) {
      console.error(
        "❌ Failed to get all status vendors:",
        error.response?.data || error.message
      );
    }

    console.log("\n🎉 Vendor status filter tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

// Run the test
testVendorStatusFilter();
