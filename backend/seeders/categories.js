import Category from '../models/Category.js';

export const seedCategories = async (vendors) => {
  const createdCategories = [];

  // Define common categories that each vendor might use
  const categoryTemplates = [
    {
      name: 'Electronics',
      description: 'Electronic devices and gadgets'
    },
    {
      name: 'Fashion',
      description: 'Clothing, accessories, and fashion items'
    },
    {
      name: 'Home & Garden',
      description: 'Home improvement and garden supplies'
    },
    {
      name: 'Sports & Outdoors',
      description: 'Sports equipment and outdoor gear'
    },
    {
      name: 'Books & Media',
      description: 'Books, movies, music, and digital media'
    },
    {
      name: 'Health & Beauty',
      description: 'Health products and beauty items'
    },
    {
      name: 'Toys & Games',
      description: 'Toys, games, and entertainment products'
    },
    {
      name: 'Automotive',
      description: 'Car parts and automotive accessories'
    }
  ];

  // Vendor-specific categories based on their business type
  const vendorSpecificCategories = {
    'Tech Gadgets Store': [
      { name: 'Electronics', description: 'Latest technology gadgets and electronics' },
      { name: 'Computers', description: 'Laptops, desktops, and computer accessories' },
      { name: 'Mobile Devices', description: 'Smartphones, tablets, and mobile accessories' },
      { name: 'Audio & Video', description: 'Headphones, speakers, and entertainment devices' }
    ],
    'Fashion Hub': [
      { name: 'Fashion', description: 'Trendy clothing and fashion accessories' },
      { name: 'Clothing', description: 'Men\'s and women\'s clothing' },
      { name: 'Accessories', description: 'Fashion accessories and jewelry' },
      { name: 'Footwear', description: 'Shoes, boots, and sandals' }
    ],
    'Home & Garden Paradise': [
      { name: 'Home & Garden', description: 'Home improvement and garden supplies' },
      { name: 'Furniture', description: 'Indoor and outdoor furniture' },
      { name: 'Garden Tools', description: 'Gardening equipment and tools' },
      { name: 'Home Decor', description: 'Decorative items for home' }
    ],
    'Sports World': [
      { name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear' },
      { name: 'Fitness Equipment', description: 'Exercise and fitness gear' },
      { name: 'Outdoor Gear', description: 'Camping and hiking equipment' },
      { name: 'Team Sports', description: 'Equipment for team sports' }
    ],
    'Book Haven': [
      { name: 'Books & Media', description: 'Books, movies, music, and digital media' },
      { name: 'Fiction', description: 'Fiction books and novels' },
      { name: 'Non-Fiction', description: 'Educational and informational books' },
      { name: 'Digital Media', description: 'E-books, audiobooks, and digital content' }
    ]
  };

  // Create categories for each vendor
  for (const vendor of vendors) {
    console.log(`   Creating categories for ${vendor.businessName}...`);
    
    // Get vendor-specific categories or use default templates
    const categoriesToCreate = vendorSpecificCategories[vendor.businessName] || 
      categoryTemplates.slice(0, 4); // Use first 4 default categories if no specific ones

    for (const categoryData of categoriesToCreate) {
      try {
        // Check if category already exists for this vendor
        const existingCategory = await Category.findOne({
          name: categoryData.name,
          vendorId: vendor._id
        });

        if (!existingCategory) {
          const category = await Category.create({
            name: categoryData.name,
            description: categoryData.description,
            vendorId: vendor._id
          });

          await category.populate('vendorId', 'businessName');
          createdCategories.push(category);
          console.log(`     ✓ Created category: ${category.name} for ${vendor.businessName}`);
        } else {
          createdCategories.push(existingCategory);
          console.log(`     ⚠ Category already exists: ${existingCategory.name} for ${vendor.businessName}`);
        }
      } catch (error) {
        console.error(`     ❌ Error creating category ${categoryData.name} for ${vendor.businessName}:`, error.message);
      }
    }
  }

  return createdCategories;
};
