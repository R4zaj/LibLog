export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: number;
  student_id: string;
  card_no: string;
  first_name: string;
  middle_initial: string | null;
  last_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  program_id: number | null;
  // /auth/me, /auth/login and /auth/register all `include: { program: true }`, so the
  // populated relation rides along on every response that carries a User — not just program_id.
  program?: { id: number; name: string; code?: string } | null;
  year_level: string | null; // e.g. "1st Year" — schema.prisma has this as String?, not a number
  qr_code: string | null;
  penalty_balance: string; // Prisma Decimal — serializes as a string, Number() before arithmetic
  created_at: string;
  updated_at: string;
  stats?: { borrowed: number; visits: number; streak: number };
  offline_secret?: string;
}

export type BorrowStatus = 'BORROWED' | 'RETURNED' | 'OVERDUE' | 'LOST';

export interface BorrowRecord {
  id: number;
  book_id: number;
  user_id: number;
  copies: number;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: BorrowStatus;
  processed_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// /borrowing/user/:id and /borrowing/user/:id/history join book (+ author, genre) onto each
// record — not part of the raw Prisma BorrowRecord shape, so it's a named extension here.
export interface BorrowRecordWithBook extends BorrowRecord {
  book?: {
    title: string;
    author?: { name: string };
    genre?: { name: string };
  };
}

export interface Book {
  id: number;
  isbn: string;
  title: string;
  author_id: number;
  publisher: string | null;
  year_published: number | null;
  edition: string | null;
  genre_id: number | null;
  lccn: string | null;
  shelf_number: string | null;
  total_copies: number;
  available_copies: number;
  condition: string; // check schema.prisma BookCondition for the exact enum values
  source_of_fund: string | null; // FundSource enum — same caveat
  date_received: string | null;
  pages: number | null;
  description: string | null;
  qr_code: string | null;
  is_archived: boolean;
  library_use_only?: boolean;
  created_at: string;
  updated_at: string;
}

// /literatures/books returns a flattened, joined shape (author as a display string, computed
// `available`/`total` counts) rather than the raw Prisma Book row above.
export interface LiteratureBook {
  id: number;
  title: string;
  author: string;
  isbn: string;
  lccn: string;
  year: number;
  shelf: string;
  total: number;
  available: number;
  condition: string;
  genre: string;
  is_archived?: boolean;
  library_use_only?: boolean;
}

// GET /attendance/active — today's checked-in users, `department` is program.name computed server-side
export interface ActiveAttendanceUser {
  id: number;
  first_name: string;
  last_name: string;
  role: UserRole;
  department: string;
  checked_in_at: string;
}

export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Announcement {
  id: number;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// The dashboard merges real Announcements with client-synthesized overdue-borrow reminders
// into one feed — this is the shape both are normalized to for rendering.
export interface DashboardNotification {
  id: string | number;
  title: string;
  body: string;
  created_at: string;
  is_overdue?: boolean;
}

export type AttendanceAction = 'CHECK_IN' | 'CHECK_OUT';

export interface AttendanceLog {
  id: number;
  user_id: number;
  action: AttendanceAction;
  scanned_qr: string;
  logged_at: string;
  duration_minutes: number | null;
}

// POST /api/attendance/scan response — note the key is `duration`, NOT `duration_minutes`
export interface ScanResponse {
  user: Omit<User, 'password_hash'>;
  action: AttendanceAction;
  duration: number | null;
}

// GET /api/attendance/stats — public, no auth required
export interface AttendanceStats {
  checkIns: number;
  checkOuts: number;
  insideNow: number;
  avgDuration: number;
  heatmapCounts: number[][]; // [7 days][12 hours, 7am-6pm]
}

export type NotificationCategory = 'ATTENDANCE' | 'BORROWING' | 'PENALTIES' | 'SYSTEM';

export interface Notification {
  id: number;
  category: NotificationCategory;
  title: string;
  message: string;
  is_read: boolean;
  target_user_id: number | null;
  triggered_by: number | null;
  ref_table: string | null;
  ref_id: number | null;
  created_at: string;
  trigger_user?: { first_name: string; last_name: string; role: UserRole };
}

// GET /api/auth/qr-token response
export interface QrTokenResponse {
  token: string;
}
