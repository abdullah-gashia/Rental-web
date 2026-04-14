// Predefined campus meetup locations for PSU Store
// Configurable — add/remove based on campus context

export interface MeetupLocationOption {
  id: string;
  label: string;
  description: string;
}

export const CAMPUS_MEETUP_LOCATIONS: MeetupLocationOption[] = [
  { id: "cafeteria1", label: "โรงอาหาร 1", description: "หน้าร้าน 7-Eleven" },
  { id: "cafeteria2", label: "โรงอาหาร 2", description: "ฝั่งตึก SC" },
  { id: "library", label: "หน้าหอสมุดกลาง", description: "ใต้ต้นจามจุรี" },
  { id: "coc", label: "อาคาร CoC", description: "ชั้น 1 ล็อบบี้" },
  { id: "sc", label: "อาคาร SC", description: "หน้าทางเข้าหลัก" },
  { id: "parkingA", label: "ลานจอดรถตึก A", description: "ชั้น 1 ทางเข้าหลัก" },
  { id: "gate1", label: "ประตู 1", description: "ป้อมยาม" },
  { id: "dorm_front", label: "หน้าหอพักนักศึกษา", description: "ป้อมรักษาความปลอดภัย" },
  { id: "seven11", label: "หน้า 7-Eleven", description: "สาขาหน้ามหาวิทยาลัย" },
];
