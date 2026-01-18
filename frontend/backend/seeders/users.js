import User from '../models/User.js';

export const seedUsers = async () => {
  const users = [
    {
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL || 'admin@demo.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'superadmin',
      isActive: true
    },
    {
      name: 'Demo Vendor',
      email: process.env.VENDOR_EMAIL || 'vendor@demo.com',
      password: process.env.VENDOR_PASSWORD || 'vendor123',
      role: 'vendor',
      isActive: true
    },
    {
      name: 'John Smith',
      email: 'john.smith@techgadgets.com',
      password: 'password123',
      role: 'vendor',
      isActive: true
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@fashionhub.com',
      password: 'password123',
      role: 'vendor',
      isActive: true
    },
    {
      name: 'Mike Wilson',
      email: 'mike.wilson@homegarden.com',
      password: 'password123',
      role: 'vendor',
      isActive: true
    },
    {
      name: 'Emily Davis',
      email: 'emily.davis@bookstore.com',
      password: 'password123',
      role: 'vendor',
      isActive: true
    },
    {
      name: 'David Brown',
      email: 'david.brown@sportsworld.com',
      password: 'password123',
      role: 'vendor',
      isActive: true
    },
    {
      name: 'Lisa Garcia',
      email: 'lisa.garcia@beautycare.com',
      password: 'password123',
      role: 'vendor',
      isActive: true
    }
  ];

  const createdUsers = [];
  
  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        const user = await User.create(userData);
        createdUsers.push(user);
        console.log(`   ✓ Created user: ${user.name} (${user.email})`);
      } else {
        createdUsers.push(existingUser);
        console.log(`   ⚠ User already exists: ${existingUser.name} (${existingUser.email})`);
      }
    } catch (error) {
      console.error(`   ❌ Error creating user ${userData.name}:`, error.message);
    }
  }

  return createdUsers;
};
