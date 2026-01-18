import Vendor from "../models/Vendor.js";

export const seedVendors = async (users) => {
  // Filter vendor users (exclude super admin)
  const vendorUsers = users.filter((user) => user.role === "vendor");

  const vendorData = [
    {
      businessName: "Demo Vendor Store",
      phone: "+61-2-9876-5432",
      address: {
        full: "123 Demo Street, Sydney, NSW 2000, Australia",
      },
      businessDetails: {
        description: "A demo vendor store for testing purposes",
        businessType: "individual",
        taxId: "12345678901", // ABN
        gstRegistered: true,
      },
      status: "active",
    },
    {
      businessName: "Tech Gadgets Store",
      phone: "+61-3-8765-4321",
      address: {
        full: "456 Tech Avenue, Melbourne, VIC 3000, Australia",
      },
      businessDetails: {
        description: "Latest technology gadgets and electronics",
        businessType: "corporation",
        taxId: "23456789012", // ABN
        gstRegistered: true,
      },
      status: "active",
    },
    {
      businessName: "Fashion Hub",
      phone: "+61-7-7654-3210",
      address: {
        full: "789 Fashion Boulevard, Brisbane, QLD 4000, Australia",
      },
      businessDetails: {
        description: "Trendy fashion and clothing for all ages",
        businessType: "llc",
        taxId: "34567890123", // ABN
        gstRegistered: true,
      },
      status: "inactive",
    },
    {
      businessName: "Home & Garden Paradise",
      phone: "+61-8-6543-2109",
      address: {
        full: "321 Garden Lane, Perth, WA 6000, Australia",
      },
      businessDetails: {
        description: "Home improvement and gardening supplies",
        businessType: "partnership",
        taxId: "45678901234", // ABN
        gstRegistered: false,
      },
      status: "pending",
    },
    {
      businessName: "Book Haven",
      phone: "+61-8-5432-1098",
      address: {
        full: "654 Library Street, Adelaide, SA 5000, Australia",
      },
      businessDetails: {
        description: "Books, magazines, and educational materials",
        businessType: "individual",
        taxId: "56789012345", // ABN
        gstRegistered: false,
      },
      status: "active",
    },
    {
      businessName: "Sports World",
      phone: "+61-3-4321-0987",
      address: {
        full: "987 Athletic Drive, Hobart, TAS 7000, Australia",
      },
      businessDetails: {
        description: "Sports equipment and athletic wear",
        businessType: "corporation",
        taxId: "67890123456", // ABN
        gstRegistered: true,
      },
      status: "inactive",
    },
    {
      businessName: "Beauty Care Plus",
      phone: "+61-2-3210-9876",
      address: {
        full: "147 Beauty Lane, Canberra, ACT 2600, Australia",
      },
      businessDetails: {
        description: "Beauty products and personal care items",
        businessType: "llc",
        taxId: "78901234567", // ABN
        gstRegistered: true,
      },
      status: "pending",
    },
  ];

  const createdVendors = [];

  for (let i = 0; i < vendorUsers.length && i < vendorData.length; i++) {
    try {
      const user = vendorUsers[i];
      const data = vendorData[i];

      // Check if vendor already exists for this user
      const existingVendor = await Vendor.findOne({ userId: user._id });

      if (!existingVendor) {
        const vendor = await Vendor.create({
          userId: user._id,
          ...data,
          verificationStatus: {
            email: true,
            phone: false,
            business: false,
          },
        });

        await vendor.populate("user", "name email");
        createdVendors.push(vendor);
        console.log(
          `   ✓ Created vendor: ${vendor.businessName} for ${vendor.user.name}`
        );
      } else {
        await existingVendor.populate("user", "name email");
        createdVendors.push(existingVendor);
        console.log(
          `   ⚠ Vendor already exists: ${existingVendor.businessName} for ${existingVendor.user.name}`
        );
      }
    } catch (error) {
      console.error(
        `   ❌ Error creating vendor for user ${vendorUsers[i]?.name}:`,
        error.message
      );
    }
  }

  return createdVendors;
};
