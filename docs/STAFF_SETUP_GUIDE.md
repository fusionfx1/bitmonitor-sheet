# คู่มือพนักงาน: BitMonitor Sheet Generator

คู่มือนี้ใช้สำหรับสร้าง Google Sheet แยกตามบัญชี Google Ads, ติดตั้ง Google Ads Script Exporter, ตรวจสอบการ sync และส่งคำขอเพิ่ม/ลดงบแบบมี Owner Approval

## ภาพรวมระบบ

| ส่วน | จำเป็นไหม | อยู่ที่ไหน | หน้าที่ |
|---|---|---|---|
| Account Workbook | จำเป็น | Google Sheets | เก็บ settings และข้อมูล Ads ที่ export มา |
| Google Ads Script Exporter | จำเป็น | Google Ads Scripts | ดึง report จาก Google Ads ลง Sheet |
| Apps Script Bridge | ไม่บังคับ | Google Apps Script | ให้ Dashboard อ่านข้อมูลจาก Sheet |
| Budget Action Requests | ใช้เมื่อมีงานงบ | Google Sheets | ให้พนักงานส่งคำขอเพิ่ม/ลดงบ |
| Dashboard | ไม่บังคับ | BitMonitor app | แสดงข้อมูลจาก Sheet/Backend |

## กฎสำคัญ

```text
1 Google Ads account = 1 Google Sheet
```

ห้ามใช้ Sheet เดียวหลายบัญชี เพราะจะทำให้ข้อมูลปนกันและ authorize script ผิดบัญชีได้

## สิ่งที่ต้องเตรียม

- Google Ads Customer ID
- ชื่อบัญชีหรือนickname
- timezone
- currency
- owner email
- สิทธิ์เข้า Google Ads account ที่ถูกต้อง
- สิทธิ์สร้าง/แก้ Google Sheet ใน Drive ที่ถูกต้อง

## ขั้นตอนที่ 1: สร้าง Workbook

1. เปิด BitMonitor Sheet Generator
2. ไปที่ `สร้าง Sheet ใหม่`
3. ใส่ account nickname
4. ใส่ Customer ID
5. เลือก timezone และ currency
6. ตั้ง environment เป็น `test` ก่อน
7. ไปที่ `Export Functions`
8. เปิดเฉพาะ export ที่ต้องใช้
9. ถ้าบัญชีไม่มี PMax ให้ปิด PMax exports
10. ไปที่ `Budget Actions` แล้วตรวจ policy
11. ไปที่ `สร้างไฟล์`
12. กด Download `.xlsx`

## ขั้นตอนที่ 2: Import เข้า Google Sheets

1. สร้าง Google Sheet ใหม่ใน Drive ของ account owner
2. ตั้งชื่อ เช่น `BitMonitor - 873-366-2880 - Account Name`
3. Import/copy ทุก tab จากไฟล์ `.xlsx`
4. ห้ามลบ tab ที่ขึ้นต้นด้วย `_`
5. ตรวจว่า tab สำคัญมีครบ:
   - `_settings_exporter`
   - `_export_jobs`
   - `_script_health`
   - `_sync_runs`
   - `_error_log`
   - `_settings_budget_actions`
   - `_budget_action_requests`
   - `_owner_approval_log`

## ขั้นตอนที่ 3: ติดตั้ง Google Ads Script Exporter

1. เปิด Google Ads account ที่ถูกต้อง
2. ไปที่ `Tools > Bulk Actions > Scripts`
3. สร้าง script ใหม่
4. ใน BitMonitor Sheet Generator กด copy `Full Google Ads Exporter Script`
5. วาง script ใน Google Ads Scripts
6. แทนที่ `PASTE_GENERATED_SHEET_URL_HERE` ด้วย URL ของ Google Sheet จริง
7. Save
8. Authorize
9. Run manual 1 ครั้ง

ห้ามวาง Apps Script Bridge ใน Google Ads Scripts

## ขั้นตอนที่ 4: ตรวจ First Run

หลัง run manual ให้เช็ค:

| เช็ค | ที่ไหน | ควรเห็น |
|---|---|---|
| Script health | `_script_health` | status = OK |
| Sync log | `_sync_runs` | มี row ใหม่ |
| Error log | `_error_log` | ไม่มี ERROR ใหม่ |
| Campaign data | `raw_campaign_daily` | มีข้อมูลถ้าบัญชีมี traffic |
| Budget data | `raw_budget_daily` | มีข้อมูลงบแบบ read-only |

ถ้าไม่มีข้อมูล ให้เช็ค date range, enabled jobs, และ `_error_log`

## ขั้นตอนที่ 5: ตั้ง Schedule

ตั้ง schedule หลังจาก manual run ผ่านเท่านั้น

1. เปิด schedule ของ Google Ads Script
2. ตั้งเป็น hourly
3. Save
4. ตรวจรอบถัดไปใน `_sync_runs`

## ขั้นตอนที่ 6: Budget Action Request

พนักงานใช้ flow นี้เมื่อเห็นว่าควรเพิ่มหรือลดงบ

1. ดูข้อมูลจาก dashboard หรือ raw tabs
2. เปิด `_budget_action_requests`
3. เพิ่ม row ใหม่
4. ใส่ข้อมูล:
   - request_id
   - requested_by
   - customer_id
   - campaign_id
   - campaign_name
   - action_type เช่น `INCREASE_BUDGET` หรือ `DECREASE_BUDGET`
   - current_budget
   - requested_budget
   - requested_change_pct
   - reason
   - evidence_tab หรือ evidence URL
5. ตั้ง status เป็น `REQUESTED`
6. แจ้ง owner ให้ review

## ขั้นตอนที่ 7: Owner Approval

Owner ต้อง review ใน `_owner_approval_log`

| decision | ความหมาย |
|---|---|
| PENDING | รอ review |
| APPROVED | อนุมัติ |
| REJECTED | ไม่อนุมัติ |

ถ้า approved แล้ว การ execute ต้องทำผ่านช่องทางที่ owner อนุมัติเท่านั้น เช่น Optmyzr หรือ owner Google Ads access

## สิ่งที่พนักงานทำได้

- ดู report
- เปิด/ปิด export jobs ตามที่ได้รับมอบหมาย
- เปลี่ยน max rows/date range ตาม SOP
- ส่งคำขอเพิ่ม/ลดงบ
- แนบเหตุผลและ evidence
- แจ้ง error ให้ owner

## สิ่งที่พนักงานห้ามทำ

- แก้ Google Ads budget โดยตรง
- เพิ่ม mutate code ใน script
- วาง script ผิดที่
- ใช้ Sheet เดียวหลายบัญชี
- ลบ system tabs
- approve คำขอของตัวเอง
- เปลี่ยน token/secrets เอง

## Troubleshooting

| ปัญหา | สาเหตุที่เป็นไปได้ | ต้องเช็ค |
|---|---|---|
| Script เปิด Sheet ไม่ได้ | URL ผิดหรือไม่มีสิทธิ์ | SHEET_URL และ permission |
| `_script_health` error | GAQL/job failed | `_error_log` |
| raw tabs ไม่มีข้อมูล | date range แคบหรือ account ไม่มี impression | `_settings_exporter`, `_export_jobs` |
| PMax tabs ว่าง | ไม่มี PMax campaign | ปิด PMax exports ได้ |
| Budget request ไม่ถูก execute | ยังไม่ owner approved | `_owner_approval_log` |
| Dashboard ว่าง | Bridge ยังไม่เชื่อมหรือยังไม่มี sync | raw tabs และ bridge setup |

## Quick Reference

```text
Exporter = Google Ads -> Sheet
Bridge = Sheet -> Dashboard
Budget Actions = Staff request -> Owner approval -> External execution
```

```text
Google Ads Script Exporter วางใน Google Ads Scripts
Apps Script Bridge วางใน Google Apps Script
```
