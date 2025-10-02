import Order from "../models/Order.js";

export const seedOrders = async (vendors, products) => {
  const customerNames = [
    "Alice Brown",
    "Bob Davis",
    "Charlie Wilson",
    "Diana Martinez",
    "Edward Johnson",
    "Fiona Smith",
    "George Taylor",
    "Hannah Lee",
    "Ian Rodriguez",
    "Julia Anderson",
    "Kevin Thompson",
    "Laura Garcia",
  ];

  const customerEmails = [
    "alice.brown@email.com",
    "bob.davis@email.com",
    "charlie.wilson@email.com",
    "diana.martinez@email.com",
    "edward.johnson@email.com",
    "fiona.smith@email.com",
    "george.taylor@email.com",
    "hannah.lee@email.com",
    "ian.rodriguez@email.com",
    "julia.anderson@email.com",
    "kevin.thompson@email.com",
    "laura.garcia@email.com",
  ];

  const orderStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const paymentStatuses = ["pending", "paid", "failed"];

  const createdOrders = [];

  // Create orders for each vendor
  for (const vendor of vendors) {
    // Get products for this vendor
    const vendorProducts = products.filter(
      (p) => p.vendorId.toString() === vendor._id.toString()
    );

    if (vendorProducts.length === 0) continue;

    // Create 8-15 orders per vendor for better sales data
    const orderCount = Math.floor(Math.random() * 8) + 8;

    for (let i = 0; i < orderCount; i++) {
      try {
        // Random customer
        const customerIndex = Math.floor(Math.random() * customerNames.length);
        const customer = {
          name: customerNames[customerIndex],
          email: customerEmails[customerIndex],
        };

        // Random number of items (1-3)
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const orderItems = [];
        let subtotal = 0;

        for (let j = 0; j < itemCount; j++) {
          const product =
            vendorProducts[Math.floor(Math.random() * vendorProducts.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const price = product.discountPrice || product.price;
          const total = quantity * price;

          orderItems.push({
            productId: product._id,
            name: product.name,
            quantity,
            price,
            total,
          });

          subtotal += total;
        }

        // Weighted status distribution for better sales data
        // 60% delivered, 20% shipped, 10% processing, 5% pending, 5% cancelled
        const statusRandom = Math.random();
        let status;
        if (statusRandom < 0.6) status = "delivered";
        else if (statusRandom < 0.8) status = "shipped";
        else if (statusRandom < 0.9) status = "processing";
        else if (statusRandom < 0.95) status = "pending";
        else status = "cancelled";

        const paymentStatus =
          status === "cancelled"
            ? "failed"
            : status === "delivered"
            ? "paid"
            : paymentStatuses[
                Math.floor(Math.random() * paymentStatuses.length)
              ];

        // Create more recent orders for better sales data
        // 70% of orders within last 30 days, 30% within last 90 days
        const isRecent = Math.random() < 0.7;
        const daysBack = isRecent ? Math.random() * 30 : Math.random() * 90;
        const createdAt = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        const orderData = {
          vendorId: vendor._id,
          customer,
          items: orderItems,
          subtotal,
          orderTotal: subtotal + subtotal * 0.08, // Add 8% tax
          tax: {
            amount: subtotal * 0.08,
            rate: 0.08,
          },
          shipping: {
            amount: subtotal > 50 ? 0 : 9.99,
            method: "Standard Shipping",
          },
          status,
          paymentStatus,
          paymentMethod: "credit_card",
          createdAt,
          updatedAt: createdAt,
        };

        // Add tracking info for shipped/delivered orders
        if (status === "shipped" || status === "delivered") {
          orderData.trackingInfo = {
            trackingNumber: `TRK${Math.random()
              .toString(36)
              .substr(2, 9)
              .toUpperCase()}`,
            trackingLink: `https://track.example.com/${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            carrier: "FedEx",
            shippedAt: new Date(
              createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000
            ),
          };
        }

        const order = await Order.create(orderData);
        await order.populate([
          { path: "vendor", select: "businessName" },
          { path: "items.productId", select: "name category" },
        ]);

        createdOrders.push(order);
        console.log(
          `   ✓ Created order: ${order.orderNumber} for ${order.vendor.businessName}`
        );
      } catch (error) {
        console.error(
          `   ❌ Error creating order for vendor ${vendor.businessName}:`,
          error.message
        );
      }
    }
  }

  return createdOrders;
};
