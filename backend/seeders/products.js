import Product from '../models/Product.js';

export const seedProducts = async (vendors) => {
  const productTemplates = [
    // Tech Gadgets Store Products
    {
      vendorIndex: 1, // Tech Gadgets Store
      products: [
        {
          name: 'Wireless Bluetooth Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: 299.99,
          discountPrice: 249.99,
          stock: 50,
          category: 'Electronics',
          subcategory: 'Audio',
          specifications: {
            brand: 'TechSound',
            color: 'Black',
            weight: 0.3
          }
        },
        {
          name: 'Smart Watch Series 5',
          description: 'Advanced smartwatch with health monitoring',
          price: 399.99,
          stock: 25,
          category: 'Electronics',
          subcategory: 'Wearables',
          specifications: {
            brand: 'SmartTech',
            color: 'Silver'
          }
        },
        {
          name: 'USB-C Fast Charger',
          description: '65W fast charging adapter with multiple ports',
          price: 49.99,
          discountPrice: 39.99,
          stock: 100,
          category: 'Electronics',
          subcategory: 'Accessories'
        },
        {
          name: 'Gaming Keyboard Pro',
          description: 'Mechanical gaming keyboard with RGB lighting',
          price: 149.99,
          stock: 30,
          category: 'Electronics',
          subcategory: 'Gaming'
        }
      ]
    },
    // Fashion Hub Products
    {
      vendorIndex: 2, // Fashion Hub
      products: [
        {
          name: 'Summer Dress Collection',
          description: 'Elegant summer dresses in various styles',
          price: 89.99,
          discountPrice: 69.99,
          stock: 100,
          category: 'Fashion',
          subcategory: 'Dresses',
          specifications: {
            material: 'Cotton Blend',
            color: 'Multi'
          }
        },
        {
          name: 'Designer Handbag',
          description: 'Luxury leather handbag with premium finish',
          price: 199.99,
          stock: 20,
          category: 'Fashion',
          subcategory: 'Accessories'
        },
        {
          name: 'Casual Sneakers',
          description: 'Comfortable casual sneakers for everyday wear',
          price: 79.99,
          discountPrice: 59.99,
          stock: 75,
          category: 'Fashion',
          subcategory: 'Footwear'
        }
      ]
    },
    // Home & Garden Products
    {
      vendorIndex: 3, // Home & Garden
      products: [
        {
          name: 'Garden Tool Set',
          description: 'Complete set of essential gardening tools',
          price: 149.99,
          stock: 30,
          category: 'Home & Garden',
          subcategory: 'Tools'
        },
        {
          name: 'Ceramic Plant Pots',
          description: 'Set of 3 decorative ceramic plant pots',
          price: 39.99,
          stock: 60,
          category: 'Home & Garden',
          subcategory: 'Decor'
        },
        {
          name: 'LED String Lights',
          description: 'Waterproof LED string lights for outdoor use',
          price: 24.99,
          discountPrice: 19.99,
          stock: 80,
          category: 'Home & Garden',
          subcategory: 'Lighting'
        }
      ]
    },
    // Book Haven Products
    {
      vendorIndex: 4, // Book Haven
      products: [
        {
          name: 'Programming Fundamentals',
          description: 'Comprehensive guide to programming basics',
          price: 49.99,
          stock: 40,
          category: 'Books',
          subcategory: 'Technology'
        },
        {
          name: 'Mystery Novel Collection',
          description: 'Set of 5 bestselling mystery novels',
          price: 79.99,
          discountPrice: 59.99,
          stock: 25,
          category: 'Books',
          subcategory: 'Fiction'
        }
      ]
    },
    // Sports World Products
    {
      vendorIndex: 5, // Sports World
      products: [
        {
          name: 'Professional Basketball',
          description: 'Official size basketball for professional play',
          price: 29.99,
          stock: 50,
          category: 'Sports',
          subcategory: 'Equipment'
        },
        {
          name: 'Yoga Mat Premium',
          description: 'Non-slip premium yoga mat with carrying strap',
          price: 39.99,
          discountPrice: 29.99,
          stock: 40,
          category: 'Sports',
          subcategory: 'Fitness'
        }
      ]
    },
    // Beauty Care Plus Products
    {
      vendorIndex: 6, // Beauty Care Plus
      products: [
        {
          name: 'Skincare Routine Set',
          description: 'Complete skincare routine with cleanser, toner, and moisturizer',
          price: 89.99,
          discountPrice: 69.99,
          stock: 35,
          category: 'Beauty',
          subcategory: 'Skincare'
        },
        {
          name: 'Professional Makeup Brush Set',
          description: 'Set of 12 professional makeup brushes',
          price: 59.99,
          stock: 30,
          category: 'Beauty',
          subcategory: 'Makeup'
        }
      ]
    }
  ];

  const createdProducts = [];

  for (const template of productTemplates) {
    if (template.vendorIndex < vendors.length) {
      const vendor = vendors[template.vendorIndex];
      
      for (const productData of template.products) {
        try {
          const product = await Product.create({
            ...productData,
            vendorId: vendor._id,
            status: 'active',
            inventory: {
              trackInventory: true,
              lowStockThreshold: 10
            },
            pricing: {
              taxable: true
            },
            shipping: {
              requiresShipping: true,
              weight: productData.specifications?.weight || 0.5
            }
          });

          await product.populate('vendor', 'businessName');
          createdProducts.push(product);
          console.log(`   ✓ Created product: ${product.name} for ${product.vendor.businessName}`);
        } catch (error) {
          console.error(`   ❌ Error creating product ${productData.name}:`, error.message);
        }
      }
    }
  }

  return createdProducts;
};
