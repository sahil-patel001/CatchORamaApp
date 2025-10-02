import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';
import Vendor from './models/Vendor.js';
import User from './models/User.js';
import Product from './models/Product.js';

dotenv.config();

async function addDemoOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the demo vendor
    const vendorUser = await User.findOne({ email: 'vendor@demo.com' });
    if (!vendorUser) {
      console.log('❌ Demo vendor user not found');
      return;
    }
    
    const vendor = await Vendor.findOne({ userId: vendorUser._id });
    if (!vendor) {
      console.log('❌ Demo vendor profile not found');
      return;
    }
    
    console.log('🏪 Found vendor:', vendor.businessName);
    
    // Get some products from other vendors to use as demo products
    const sampleProducts = await Product.find().limit(5);
    if (sampleProducts.length === 0) {
      console.log('❌ No products found to create orders');
      return;
    }
    
    console.log('📦 Found', sampleProducts.length, 'products to use');
    
    const customerNames = [
      'Alice Brown', 'Bob Davis', 'Charlie Wilson', 'Diana Martinez',
      'Edward Johnson', 'Fiona Smith', 'George Taylor', 'Hannah Lee'
    ];
    
    const customerEmails = [
      'alice.brown@email.com', 'bob.davis@email.com', 'charlie.wilson@email.com',
      'diana.martinez@email.com', 'edward.johnson@email.com', 'fiona.smith@email.com',
      'george.taylor@email.com', 'hannah.lee@email.com'
    ];
    
    const createdOrders = [];
    
    // Create 12 orders for the demo vendor
    for (let i = 0; i < 12; i++) {
      try {
        // Random customer
        const customerIndex = Math.floor(Math.random() * customerNames.length);
        const customer = {
          name: customerNames[customerIndex],
          email: customerEmails[customerIndex]
        };
        
        // Random product and quantity
        const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = product.discountPrice || product.price;
        const total = quantity * price;
        
        const orderItems = [{
          productId: product._id,
          name: product.name,
          quantity,
          price,
          total
        }];
        
        const subtotal = total;
        
        // 80% delivered, 20% other statuses
        const status = Math.random() < 0.8 ? 'delivered' : 
                      Math.random() < 0.5 ? 'shipped' : 'processing';
        
        // Random date within last 30 days
        const daysBack = Math.random() * 30;
        const createdAt = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
        
        const orderData = {
          vendorId: vendor._id,
          customer,
          items: orderItems,
          subtotal,
          orderTotal: subtotal + (subtotal * 0.1), // Add 10% tax
          tax: {
            amount: subtotal * 0.1,
            rate: 0.1
          },
          shipping: {
            amount: subtotal > 50 ? 0 : 9.99,
            method: 'Standard Shipping'
          },
          status,
          paymentStatus: status === 'delivered' ? 'paid' : 'pending',
          paymentMethod: 'credit_card',
          createdAt,
          updatedAt: createdAt
        };
        
        // Add tracking info for shipped/delivered orders
        if (status === 'shipped' || status === 'delivered') {
          orderData.trackingInfo = {
            trackingNumber: `TRK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            trackingLink: `https://track.example.com/${Math.random().toString(36).substr(2, 9)}`,
            carrier: 'Australia Post',
            shippedAt: new Date(createdAt.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000)
          };
        }
        
        const order = await Order.create(orderData);
        createdOrders.push(order);
        
        console.log(`   ✓ Created order: ${order.orderNumber} - $${order.orderTotal.toFixed(2)} - ${status}`);
      } catch (error) {
        console.error(`   ❌ Error creating order ${i + 1}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully created ${createdOrders.length} orders for ${vendor.businessName}`);
    
    // Verify the orders were created
    const totalOrders = await Order.countDocuments({ vendorId: vendor._id });
    const deliveredOrders = await Order.countDocuments({ 
      vendorId: vendor._id, 
      status: 'delivered' 
    });
    
    console.log(`📊 Final count: ${totalOrders} total orders, ${deliveredOrders} delivered orders`);
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addDemoOrders();
