import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/types";

export const generateInvoice = (order: Order) => {
  const doc = new jsPDF();

  // 1. Header
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 15, 25);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${order.orderNumber}`, 15, 35);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 15, 42);

  // Add a logo placeholder
  doc.setFillColor(240, 240, 240);
  doc.rect(140, 15, 55, 20, "F");
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text("Your Company Logo", 148, 27);

  // 2. Customer Information
  doc.setLineWidth(0.5);
  doc.line(15, 55, 195, 55);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 15, 65);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(order.customer.name, 15, 72);
  doc.text(order.customer.email, 15, 79);

  // 3. Table of Items
  const tableColumn = ["#", "Item", "Quantity", "Unit Price", "Total"];
  const tableRows: (string | number)[][] = [];

  order.items.forEach((item, index) => {
    const itemData = [
      index + 1,
      item.productId.name,
      item.quantity,
      `$${item.price.toFixed(2)}`,
      `$${(item.price * item.quantity).toFixed(2)}`,
    ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 95,
    theme: "striped",
    headStyles: { fillColor: [22, 160, 133] },
    margin: { top: 90 },
  });

  // 4. Totals Section
  const finalY = (doc as any).lastAutoTable.finalY;
  const subtotal = order.orderTotal;
  const shipping = 5.0; // Mock data
  const tax = subtotal * 0.1; // Mock 10% tax
  const total = subtotal + shipping + tax;

  doc.setFontSize(12);
  doc.text("Subtotal:", 140, finalY + 10);
  doc.text(`$${subtotal.toFixed(2)}`, 170, finalY + 10);

  doc.text("Shipping:", 140, finalY + 17);
  doc.text(`$${shipping.toFixed(2)}`, 170, finalY + 17);

  doc.text("Tax (10%):", 140, finalY + 24);
  doc.text(`$${tax.toFixed(2)}`, 170, finalY + 24);

  doc.setFont("helvetica", "bold");
  doc.text("Total:", 140, finalY + 31);
  doc.text(`$${total.toFixed(2)}`, 170, finalY + 31);

  // 5. Footer
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(
    "Thank you for your business!",
    105,
    doc.internal.pageSize.height - 15,
    { align: "center" }
  );

  // Save the PDF
  doc.save(`invoice-${order.orderNumber}.pdf`);
};
