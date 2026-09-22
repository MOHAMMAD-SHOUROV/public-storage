SHOUROV STORAGE - STARTER

এই project-এ আছে:
- Email/Password Register
- Login/Logout
- Photo/Video multiple upload
- User-এর নিজের folder path
- Private Supabase Storage
- নিজের file open/delete

1) Supabase Dashboard খুলুন।
2) Project Settings -> API এ যান।
3) Project URL কপি করুন।
4) Publishable key / anon key কপি করুন।
5) app.js-এর নিচের দুই জায়গায় বসান:
   SUPABASE_URL
   SUPABASE_ANON_KEY

6) Supabase -> SQL Editor খুলুন।
7) supabase-storage-policies.sql-এর পুরো code paste করে Run করুন।

8) GitHub repository-তে index.html, style.css, app.js এবং SQL file upload করুন।
9) Vercel-এ GitHub repo import করে Deploy করুন।

গুরুত্বপূর্ণ:
- service_role key কখনো browser code-এ দেবেন না।
- এই starter-এ media bucket private রাখা হয়েছে।
- Public folder/share link-এর secure ব্যবস্থা পরের ধাপে Edge Function/DB দিয়ে যোগ করা উচিত।
- Supabase Free plan-এ storage/bandwidth limits থাকে; unlimited lifetime storage ধরে নেওয়া যাবে না।
