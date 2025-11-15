import axios from 'axios';

const API_BASE = 'http://localhost:5001/api/v1';

async function testSalesAPI() {
  try {
    console.log('🔐 Testing login...');
    
    // Login as demo vendor
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'vendor@demo.com',
      password: 'vendor123'
    }, {
      withCredentials: true
    });
    
    console.log('✅ Login successful');
    console.log('User:', loginResponse.data.data.user.name);
    console.log('Role:', loginResponse.data.data.user.role);
    
    // Extract cookies for subsequent requests
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    
    console.log('\n📊 Testing sales report API...');
    
    // Test weekly sales report
    const salesResponse = await axios.get(`${API_BASE}/reports/sales?period=weekly`, {
      headers: {
        'Cookie': cookieHeader
      }
    });
    
    console.log('✅ Sales API successful');
    console.log('Response structure:', {
      success: salesResponse.data.success,
      hasVendorInfo: !!salesResponse.data.data.vendorInfo,
      hasSalesData: !!salesResponse.data.data.salesData,
      hasSummary: !!salesResponse.data.data.summary
    });
    
    const { vendorInfo, salesData, summary } = salesResponse.data.data;
    
    console.log('\n🏢 Vendor Info:');
    console.log('  Business Name:', vendorInfo.businessName);
    console.log('  ABN:', vendorInfo.abn);
    console.log('  GST Registered:', vendorInfo.gstRegistered);
    
    console.log('\n📈 Summary:');
    console.log('  Total Revenue: $' + summary.totalRevenue.toFixed(2));
    console.log('  Total Orders:', summary.totalOrders);
    console.log('  Period:', summary.period);
    console.log('  Start Date:', summary.startDate);
    
    console.log('\n📋 Sales Data:');
    console.log('  Number of entries:', salesData.length);
    if (salesData.length > 0) {
      console.log('  Sample entries:');
      salesData.slice(0, 3).forEach((entry, index) => {
        console.log(`    ${index + 1}. ${entry._id}: $${entry.totalSales.toFixed(2)} (${entry.orderCount} orders)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSalesAPI();
