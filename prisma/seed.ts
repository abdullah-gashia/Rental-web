import "dotenv/config";
import { PrismaClient, ListingType, ItemCondition, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcryptjs from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Raw item data from the prototype ────────────────

interface RawItem {
  title: string;
  price: number;
  listingType: ListingType;
  condition: ItemCondition;
  shippable: boolean;
  location: string;
  desc: string;
  catSlug: string;
  emoji: string;
  color: string;
  rating: number;
}

const secondhandItems: RawItem[] = [
  { title: "ราวตากผ้า", price: 15, listingType: "SELL", condition: "GOOD", shippable: true, location: "หอ 3", desc: "ราวตากผ้าสแตนเลส ใช้งานได้ปกติ ราคาถูกมาก", catSlug: "secondhand", emoji: "👕", color: "#e8e5df", rating: 5 },
  { title: "โคมไฟหัวเตียง 2 ตัว", price: 10, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 5", desc: "โคมไฟหัวเตียงสีขาว 2 ตัว พร้อมหลอดไฟ", catSlug: "secondhand", emoji: "💡", color: "#fef9c3", rating: 5 },
  { title: "พัดลม Panasonic 12\"", price: 120, listingType: "SELL", condition: "FAIR", shippable: false, location: "หอ 4", desc: "พัดลมตั้งโต๊ะ Panasonic ใช้มา 2 ปี ลมยังแรงดี", catSlug: "secondhand", emoji: "🌀", color: "#dbeafe", rating: 4 },
  { title: "หนังสือ TOEIC 800+", price: 80, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "SC", desc: "ซื้อใหม่ อ่านครั้งเดียว มีเฉลยครบ", catSlug: "books", emoji: "📚", color: "#fef3c7", rating: 5 },
  { title: "เก้าอี้ทำงาน", price: 350, listingType: "SELL", condition: "GOOD", shippable: true, location: "หอ 7", desc: "ปรับความสูงได้ มีที่วางแขน สภาพดีมาก", catSlug: "secondhand", emoji: "🪑", color: "#d1fae5", rating: 4 },
  { title: "กระเป๋า Laptop 15\"", price: 200, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "โรงอาหาร", desc: "กันน้ำ บุด้านใน ซื้อมาแต่ไม่ค่อยใช้", catSlug: "secondhand", emoji: "💼", color: "#ede9fe", rating: 5 },
  { title: "ไม้แบด Yonex (คู่)", price: 480, listingType: "SELL", condition: "GOOD", shippable: false, location: "PE", desc: "Yonex 2 อัน พร้อมกระเป๋า ขึงเอ็นใหม่", catSlug: "secondhand", emoji: "🏸", color: "#fce7f3", rating: 5 },
  { title: "หม้อหุงข้าว 1L", price: 150, listingType: "SELL", condition: "FAIR", shippable: false, location: "หอ 5", desc: "หม้อหุงข้าว 1L ใช้งานปกติ เหมาะ 1-2 คน", catSlug: "secondhand", emoji: "🍚", color: "#fff7ed", rating: 4 },
  { title: "โต๊ะพับอเนกประสงค์", price: 280, listingType: "SELL", condition: "FAIR", shippable: false, location: "หน้าหอ 1", desc: "โต๊ะพับพลาสติก 60x40 cm พกพาสะดวก", catSlug: "secondhand", emoji: "📋", color: "#f1f5f9", rating: 3 },
  { title: "โปสเตอร์ Ghibli 5 ใบ", price: 60, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "หอ 2", desc: "Studio Ghibli A3 พิมพ์ใหม่ ชุด 5 ภาพ", catSlug: "secondhand", emoji: "🎨", color: "#ecfdf5", rating: 5 },
  { title: "ลำโพง JBL Go 3", price: 550, listingType: "SELL", condition: "GOOD", shippable: false, location: "CoC", desc: "กันน้ำได้ ใช้มา 6 เดือน เสียงดี", catSlug: "electronics", emoji: "🔊", color: "#dbeafe", rating: 5 },
  { title: "กระทะเคลือบ Tefal", price: 90, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 8", desc: "Tefal 28cm ไม่ติด ใช้มาปีเดียว", catSlug: "secondhand", emoji: "🍳", color: "#fef3c7", rating: 4 },
  { title: "Nike Air M42", price: 700, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "SC", desc: "Nike Air Max ไซส์ 42 ใส่ครั้งเดียว สภาพ 99%", catSlug: "secondhand", emoji: "👟", color: "#fee2e2", rating: 4 },
  { title: "ไมโครโฟน Blue Yeti", price: 1200, listingType: "SELL", condition: "GOOD", shippable: false, location: "CoC Lab", desc: "Blue Yeti USB สำหรับ Podcast/Zoom สภาพดี", catSlug: "electronics", emoji: "🎙️", color: "#ede9fe", rating: 5 },
  { title: "บอร์ดเกม Catan", price: 400, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 6", desc: "ครบกล่อง เล่นประมาณ 10 ครั้ง", catSlug: "boardgames", emoji: "🎲", color: "#fef9c3", rating: 5 },
  { title: "จักรยานพับ Dahon 20\"", price: 2800, listingType: "SELL", condition: "GOOD", shippable: false, location: "หน้าหอ 4", desc: "Dahon 20 นิ้ว 7 สปีด ใช้ 1 ปี สภาพดี", catSlug: "vehicles", emoji: "🚲", color: "#d1fae5", rating: 4 },
  { title: "เครื่องชงกาแฟ Moka", price: 320, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "หอ 9", desc: "Moka Pot อลูมิเนียม 3 Cup Italian style", catSlug: "secondhand", emoji: "☕", color: "#fff7ed", rating: 5 },
  { title: "Keyboard Logitech K2", price: 280, listingType: "SELL", condition: "FAIR", shippable: false, location: "CoC", desc: "Wireless ใช้ถ่านยาว ใช้มา 1 ปี", catSlug: "electronics", emoji: "⌨️", color: "#f1f5f9", rating: 4 },
  { title: "กีตาร์โปร่ง Yamaha", price: 1500, listingType: "SELL", condition: "GOOD", shippable: false, location: "อาคาร Art", desc: "Yamaha F310 ขนาดเต็ม สภาพดีมาก", catSlug: "secondhand", emoji: "🎸", color: "#fce7f3", rating: 5 },
  { title: "สมุดจด Notebook A5", price: 25, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "ร้านถ่าย", desc: "A5 ปกแข็ง 100 หน้า กระดาษหนา เหลือ 3 เล่ม", catSlug: "books", emoji: "📓", color: "#ecfdf5", rating: 3 },
];

const rentalItems: RawItem[] = [
  { title: "กล้อง Sony A6400", price: 300, listingType: "RENT", condition: "LIKE_NEW", shippable: false, location: "CoC", desc: "Sony A6400 พร้อมเลนส์ 16-50mm", catSlug: "rental", emoji: "📷", color: "#dbeafe", rating: 0 },
  { title: "โดรน DJI Mini 3", price: 500, listingType: "RENT", condition: "GOOD", shippable: false, location: "ENG", desc: "DJI Mini 3 กล้อง 4K บิน 38 นาที", catSlug: "rental", emoji: "🚁", color: "#e0e7ff", rating: 5 },
  { title: "โปรเจคเตอร์ Full HD", price: 400, listingType: "RENT", condition: "GOOD", shippable: false, location: "SC", desc: "Full HD 3000 lumens พร้อม HDMI", catSlug: "electronics", emoji: "📽️", color: "#fef9c3", rating: 4 },
  { title: "เต็นท์ 4 คน Coleman", price: 200, listingType: "RENT", condition: "GOOD", shippable: false, location: "หน้า PE", desc: "Coleman 4 คน กันน้ำ ใช้ครั้งเดียว", catSlug: "rental", emoji: "⛺", color: "#d1fae5", rating: 5 },
  { title: "จักรยาน MTB", price: 80, listingType: "RENT", condition: "FAIR", shippable: false, location: "หอ 6", desc: "MTB 21 สปีด พร้อมหมวกกันน็อค", catSlug: "vehicles", emoji: "🚵", color: "#fee2e2", rating: 4 },
  { title: "ชุดถ่ายรูป LED Ring", price: 150, listingType: "RENT", condition: "GOOD", shippable: false, location: "CoC", desc: "Ring Light 18\" + Tripod + Phone Holder", catSlug: "rental", emoji: "💡", color: "#fce7f3", rating: 5 },
  { title: "กีตาร์ไฟฟ้า Squier", price: 250, listingType: "RENT", condition: "GOOD", shippable: false, location: "Art", desc: "Squier Strat + Amp + Cable", catSlug: "rental", emoji: "🎸", color: "#ede9fe", rating: 4 },
  { title: "Power Bank 20000mAh", price: 50, listingType: "RENT", condition: "LIKE_NEW", shippable: false, location: "หอ 2", desc: "Anker 20000mAh 65W PD 3 port", catSlug: "rental", emoji: "🔋", color: "#ecfdf5", rating: 5 },
  { title: "บอร์ดเกม Monopoly", price: 100, listingType: "RENT", condition: "GOOD", shippable: false, location: "หอ 8", desc: "Monopoly Deluxe ครบ เล่น 2-8 คน", catSlug: "boardgames", emoji: "🎲", color: "#fef3c7", rating: 4 },
  { title: "สกู๊ตเตอร์ไฟฟ้า", price: 200, listingType: "RENT", condition: "GOOD", shippable: false, location: "หน้าหอ 1", desc: "25km/h แบตอยู่ได้ 30km", catSlug: "vehicles", emoji: "🛴", color: "#d1fae5", rating: 5 },
  { title: "เปียโน Keyboard 61 คีย์", price: 300, listingType: "RENT", condition: "GOOD", shippable: false, location: "Art", desc: "Casio CT-S300 61 คีย์ + adapter", catSlug: "rental", emoji: "🎹", color: "#ede9fe", rating: 4 },
  { title: "GoPro Hero 11", price: 350, listingType: "RENT", condition: "GOOD", shippable: false, location: "PE", desc: "GoPro Hero 11 Black ครบ mount", catSlug: "rental", emoji: "🎥", color: "#dbeafe", rating: 5 },
  { title: "ลำโพง Bluetooth 360°", price: 120, listingType: "RENT", condition: "GOOD", shippable: false, location: "CoC", desc: "JBL Charge 5 กันน้ำ IPX7", catSlug: "rental", emoji: "🔈", color: "#f1f5f9", rating: 4 },
  { title: "ชุดแคมป์ปิ้งเล็ก", price: 180, listingType: "RENT", condition: "GOOD", shippable: false, location: "หน้า PE", desc: "เตาแก๊ส + ถาด + ช้อนส้อม 2-3 คน", catSlug: "rental", emoji: "🏕️", color: "#d1fae5", rating: 5 },
  { title: "WiFi Router 4G พกพา", price: 80, listingType: "RENT", condition: "GOOD", shippable: false, location: "CoC", desc: "Router 4G True/AIS ระหว่างเดินทาง", catSlug: "rental", emoji: "📡", color: "#ecfdf5", rating: 4 },
  { title: "ชุดทำอาหารแคมป์", price: 150, listingType: "RENT", condition: "FAIR", shippable: false, location: "หอ 5", desc: "ชุดหม้อ+กระทะ ไทเทเนียม น้ำหนักเบา", catSlug: "rental", emoji: "🍲", color: "#fff7ed", rating: 3 },
  { title: "Nintendo Switch OLED", price: 250, listingType: "RENT", condition: "GOOD", shippable: false, location: "หอ 7", desc: "Switch OLED + Joy-Con + 2 เกมส์", catSlug: "rental", emoji: "🎮", color: "#fce7f3", rating: 5 },
  { title: "ชุดไม้เทนนิส 2 อัน", price: 100, listingType: "RENT", condition: "GOOD", shippable: false, location: "PE", desc: "Wilson 2 อัน + ลูก 3 ลูก", catSlug: "rental", emoji: "🎾", color: "#fef9c3", rating: 4 },
  { title: "Projector Screen 100\"", price: 200, listingType: "RENT", condition: "GOOD", shippable: false, location: "CoC 301", desc: "จอ 100\" 16:9 ขาตั้ง", catSlug: "rental", emoji: "🖥️", color: "#e0e7ff", rating: 5 },
  { title: "บอร์ดเกม Party Pack", price: 120, listingType: "RENT", condition: "GOOD", shippable: false, location: "หอ 3", desc: "UNO + Jenga + Pictionary 4-10 คน", catSlug: "boardgames", emoji: "🎭", color: "#fef3c7", rating: 5 },
];

const electronicsItems: RawItem[] = [
  { title: "MacBook Air M1 13\"", price: 18500, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 9", desc: "M1 RAM 8GB SSD 256GB ใช้ 1 ปี ไม่มีรอย", catSlug: "electronics", emoji: "💻", color: "#f1f5f9", rating: 5 },
  { title: "Sony WH-1000XM4", price: 5200, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "CoC", desc: "ANC กล่องครบ ใช้แค่ 2-3 ครั้ง", catSlug: "electronics", emoji: "🎧", color: "#1c1c1e", rating: 5 },
  { title: "iPad Air 5 Wi-Fi 64GB", price: 12000, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 4", desc: "iPad Air 5 Starlight ใช้ 8 เดือน + case", catSlug: "electronics", emoji: "📱", color: "#e0f2fe", rating: 4 },
  { title: "Keychron K2 Hot-swap", price: 1800, listingType: "SELL", condition: "GOOD", shippable: false, location: "CoC Lab", desc: "K2 RGB Brown switch", catSlug: "electronics", emoji: "⌨️", color: "#fef3c7", rating: 5 },
  { title: "LG 27UK850 4K Monitor", price: 6500, listingType: "SELL", condition: "FAIR", shippable: false, location: "หอ 8", desc: "27\" 4K HDR ใช้ 2 ปี มีรอยขอบ", catSlug: "electronics", emoji: "🖥️", color: "#ede9fe", rating: 3 },
  { title: "GoPro Hero 10 Black", price: 6800, listingType: "SELL", condition: "GOOD", shippable: false, location: "CoC", desc: "GoPro 10 5K video ครบอุปกรณ์", catSlug: "electronics", emoji: "🎥", color: "#dbeafe", rating: 5 },
  { title: "Kindle Paperwhite Gen5", price: 2400, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "SC", desc: "16GB กันน้ำ ใช้น้อยมาก", catSlug: "electronics", emoji: "📖", color: "#f1f5f9", rating: 5 },
  { title: "Airpods Pro 2nd Gen", price: 4500, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 2", desc: "Gen2 ANC กล่อง MagSafe ใช้ 6 เดือน", catSlug: "electronics", emoji: "🎵", color: "#f8fafc", rating: 5 },
  { title: "Raspberry Pi 4B 4GB", price: 1900, listingType: "SELL", condition: "GOOD", shippable: false, location: "CoC Lab", desc: "Pi 4B 4GB + SD 32GB + case", catSlug: "electronics", emoji: "🖥️", color: "#d1fae5", rating: 4 },
  { title: "Logitech MX Master 3S", price: 2200, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "CoC", desc: "Wireless เงียบมาก ใช้ 1 เดือน", catSlug: "electronics", emoji: "🖱️", color: "#fce7f3", rating: 5 },
  { title: "Webcam Logitech C920", price: 1400, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 6", desc: "C920 Full HD 1080p Zoom ใช้ 1 ปี", catSlug: "electronics", emoji: "📹", color: "#e0e7ff", rating: 4 },
  { title: "Xiaomi Band 7 Pro", price: 900, listingType: "SELL", condition: "GOOD", shippable: false, location: "CoC", desc: "GPS วัดชีพจร สายเปลี่ยนแล้ว", catSlug: "electronics", emoji: "⌚", color: "#fef9c3", rating: 4 },
  { title: "USB-C Hub 7-in-1", price: 450, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "CoC", desc: "HDMI 4K + USB3.0x3 + SD + PD 100W", catSlug: "electronics", emoji: "🔌", color: "#ecfdf5", rating: 5 },
  { title: "SSD Samsung T7 1TB", price: 2800, listingType: "SELL", condition: "GOOD", shippable: false, location: "SC", desc: "T7 1TB USB 3.2 Gen2 1050MB/s", catSlug: "electronics", emoji: "💾", color: "#f1f5f9", rating: 5 },
  { title: "Ring Light 18\" + Tripod", price: 680, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 3", desc: "18\" + ขาตั้ง 2m ถ่ายรูป/สตรีม", catSlug: "electronics", emoji: "💡", color: "#fff7ed", rating: 4 },
  { title: "Wacom Intuos S", price: 1600, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "Art", desc: "Bluetooth วาดรูป/ตัดต่อ + ปากกา", catSlug: "electronics", emoji: "🖊️", color: "#ede9fe", rating: 5 },
  { title: "Marshall Emberton II", price: 3200, listingType: "SELL", condition: "GOOD", shippable: false, location: "หอ 9", desc: "Bluetooth กันน้ำ IPX7 เสียงเต็ม", catSlug: "electronics", emoji: "🎶", color: "#1c1c1e", rating: 5 },
  { title: "Magsafe 67W Adapter", price: 700, listingType: "SELL", condition: "GOOD", shippable: false, location: "CoC", desc: "MacBook Air M1/M2 ของแท้", catSlug: "electronics", emoji: "🔌", color: "#f1f5f9", rating: 4 },
  { title: "TP-Link AX1500 WiFi6", price: 800, listingType: "SELL", condition: "FAIR", shippable: false, location: "หอ 7", desc: "WiFi 6 ย้ายหอเลยขาย", catSlug: "electronics", emoji: "📡", color: "#d1fae5", rating: 4 },
  { title: "Arduino Uno Kit", price: 350, listingType: "SELL", condition: "LIKE_NEW", shippable: false, location: "CoC Lab", desc: "Uno Rev3 + breadboard + sensor kit", catSlug: "electronics", emoji: "🤖", color: "#ecfdf5", rating: 5 },
];

// ─── Main seed function ──────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean existing data (order matters for FK constraints)
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.itemImage.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // ── 1. Users ───────────────────────────────────────

  const adminHash = await bcryptjs.hash("admin", 12);
  const studentHash = await bcryptjs.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@psu.ac.th",
      name: "Admin",
      password: adminHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  const studentData = [
    { email: "somchai.p@psu.ac.th", name: "Somchai P." },
    { email: "nattapong.k@psu.ac.th", name: "Nattapong K." },
    { email: "supassara.w@psu.ac.th", name: "Supassara W." },
    { email: "jirapat.t@psu.ac.th", name: "Jirapat T." },
    { email: "kanya.s@psu.ac.th", name: "Kanya S." },
    { email: "phuwadol.m@psu.ac.th", name: "Phuwadol M." },
    { email: "chayanis.n@psu.ac.th", name: "Chayanis N." },
    { email: "thanawat.r@psu.ac.th", name: "Thanawat R." },
    { email: "siriporn.v@psu.ac.th", name: "Siriporn V." },
    { email: "arthit.c@psu.ac.th", name: "Arthit C." },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.user.create({
        data: { ...s, password: studentHash, role: "STUDENT" },
      })
    )
  );
  console.log(`✅ ${students.length} students created`);

  // ── 2. Categories ──────────────────────────────────

  const categoryData = [
    { slug: "secondhand", nameTh: "สินค้ามือสอง", nameEn: "Secondhand", emoji: "🏷️" },
    { slug: "electronics", nameTh: "อิเล็กทรอนิกส์", nameEn: "Electronics", emoji: "💻" },
    { slug: "vehicles", nameTh: "ยานพาหนะ", nameEn: "Vehicles", emoji: "🚲" },
    { slug: "boardgames", nameTh: "บอร์ดเกม", nameEn: "Boardgames", emoji: "🎲" },
    { slug: "books", nameTh: "หนังสือ", nameEn: "Books", emoji: "📚" },
    { slug: "rental", nameTh: "ปล่อยเช่า", nameEn: "Rentals", emoji: "🔑" },
  ];

  const categories = await Promise.all(
    categoryData.map((c) => prisma.category.create({ data: c }))
  );
  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  console.log(`✅ ${categories.length} categories created`);

  // ── 3. Items ───────────────────────────────────────

  const allRawItems = [...secondhandItems, ...rentalItems, ...electronicsItems];

  const items = await Promise.all(
    allRawItems.map((raw, i) => {
      const seller = students[i % students.length];
      return prisma.item.create({
        data: {
          title: raw.title,
          description: raw.desc,
          price: raw.price,
          emoji: raw.emoji,
          color: raw.color,
          listingType: raw.listingType,
          condition: raw.condition,
          shippable: raw.shippable,
          location: raw.location,
          rating: raw.rating,
          sellerId: seller.id,
          categoryId: catMap[raw.catSlug],
        },
      });
    })
  );
  console.log(`✅ ${items.length} items created`);

  // ── 4. Sample conversation ─────────────────────────

  const conv = await prisma.conversation.create({
    data: {
      itemId: items[0].id,
      members: { connect: [{ id: students[0].id }, { id: students[1].id }] },
      messages: {
        create: [
          { content: "สินค้ายังมีอยู่ไหมครับ?", senderId: students[1].id },
          { content: "ยังมีครับ สนใจมาดูได้เลย", senderId: students[0].id },
          { content: "วันนี้ว่างไหมครับ? จะไปดู", senderId: students[1].id },
        ],
      },
    },
  });
  console.log(`✅ Sample conversation created (${conv.id})`);

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
