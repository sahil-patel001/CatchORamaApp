import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/v1';

// Test credentials
const VENDOR_CREDENTIALS = {
  email: 'vendor@demo.com',
  password: 'vendor123'
};

const ADMIN_CREDENTIALS = {
  email: 'admin@demo.com',
  password: 'admin123'
};

let vendorToken = '';
let adminToken = '';

// Login function
const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
};

// Test category creation
const testCategoryCreation = async () => {
  try {
    console.log('🧪 Testing Category Creation...\n');

    // Login as vendor
    console.log('1. Logging in as vendor...');
    vendorToken = await login(VENDOR_CREDENTIALS);
    console.log('✅ Vendor login successful');

    // Login as admin
    console.log('2. Logging in as admin...');
    adminToken = await login(ADMIN_CREDENTIALS);
    console.log('✅ Admin login successful');

    // Test 1: Create category as vendor
    console.log('\n3. Testing category creation as vendor...');
    try {
      const vendorCategoryResponse = await axios.post(
        `${API_BASE_URL}/categories`,
        {
          name: 'Clothing',
          description: 'Clothing and apparel items'
        },
        {
          headers: { Authorization: `Bearer ${vendorToken}` }
        }
      );
      console.log('✅ Vendor category creation successful:', vendorCategoryResponse.data.data);
    } catch (error) {
      console.error('❌ Vendor category creation failed:', error.response?.data || error.message);
    }

    // Test 2: Create same category name for different vendor (should work now)
    console.log('\n4. Testing duplicate category name for different vendor...');
    try {
      // First, get a different vendor ID for admin to use
      const vendorsResponse = await axios.get(`${API_BASE_URL}/vendors`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const vendors = vendorsResponse.data.data;
      const differentVendor = vendors.find(v => v.businessName !== 'Demo Vendor Store');
      
      if (differentVendor) {
        const adminCategoryResponse = await axios.post(
          `${API_BASE_URL}/categories`,
          {
            name: 'Clothing', // Same name as vendor's category
            description: 'Fashion and clothing items',
            vendorId: differentVendor._id
          },
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );
        console.log('✅ Admin category creation with duplicate name successful:', adminCategoryResponse.data.data);
      } else {
        console.log('⚠️ No different vendor found for testing');
      }
    } catch (error) {
      console.error('❌ Admin category creation failed:', error.response?.data || error.message);
    }

    // Test 3: Try to create duplicate category for same vendor (should fail)
    console.log('\n5. Testing duplicate category for same vendor (should fail)...');
    try {
      await axios.post(
        `${API_BASE_URL}/categories`,
        {
          name: 'Clothing', // Same name for same vendor
          description: 'Another clothing category'
        },
        {
          headers: { Authorization: `Bearer ${vendorToken}` }
        }
      );
      console.log('❌ This should have failed - duplicate category for same vendor was allowed');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.data?.error?.includes('duplicate')) {
        console.log('✅ Correctly rejected duplicate category for same vendor');
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 4: List categories for vendor
    console.log('\n6. Listing categories for vendor...');
    try {
      const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${vendorToken}` }
      });
      console.log('✅ Vendor categories:', categoriesResponse.data.data.map(c => ({ name: c.name, vendor: c.vendorId?.businessName })));
    } catch (error) {
      console.error('❌ Failed to list vendor categories:', error.response?.data || error.message);
    }

    // Test 5: List all categories for admin
    console.log('\n7. Listing all categories for admin...');
    try {
      const allCategoriesResponse = await axios.get(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ All categories:', allCategoriesResponse.data.data.map(c => ({ name: c.name, vendor: c.vendorId?.businessName })));
    } catch (error) {
      console.error('❌ Failed to list all categories:', error.response?.data || error.message);
    }

    console.log('\n🎉 Category creation tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testCategoryCreation();
