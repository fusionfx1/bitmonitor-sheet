import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

export function HelpPage() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>วิธีใช้งาน</Typography>
        <Typography variant="body2" color="text.secondary">
          คู่มืออ้างอิงสำหรับการใช้งาน BitMonitor Sheet Generator
        </Typography>
      </Box>

      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>หลักการสำคัญ:</strong> 1 บัญชี Google Ads = 1 Sheet แยกเดี่ยว
        ห้ามใช้ Sheet เดียวกันข้ามหลายบัญชีโดยเด็ดขาด
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>BitMonitor Sheet Generator คืออะไร?</Typography>
          <Typography variant="body2" color="text.secondary">
            BitMonitor Sheet Generator สร้าง Google Sheets workbook template แบบแยกเดี่ยวสำหรับบัญชี Google Ads แต่ละบัญชี
            Sheet ที่สร้างขึ้นจะมี tabs ตั้งค่าทั้งหมด, การตั้งค่า export jobs, bridge settings และ dashboard settings
            ที่ต้องการสำหรับ Google Ads Script และ Apps Script bridge ของแต่ละบัญชี
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>ทำไมต้อง 1 Sheet ต่อ 1 บัญชี?</Typography>
          <Box component="ul" sx={{ pl: 2, mt: 0 }}>
            {[
              'ป้องกันปัญหาสิทธิ์การเข้าถึงข้ามบัญชี',
              'ป้องกันข้อมูลปะปนกันระหว่างบัญชี',
              'ทำให้การทดสอบแยกและปลอดภัย',
              'ให้แต่ละบัญชีตั้งค่าได้อิสระ',
              'ลดความเสี่ยงเมื่อ script ของบัญชีใดบัญชีหนึ่งมีข้อผิดพลาด',
            ].map((item, i) => (
              <Typography component="li" variant="body2" color="text.secondary" key={i}>{item}</Typography>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>ขั้นตอนการใช้งาน</Typography>
          {[
            { step: '1', title: 'สร้าง Sheet ใหม่', desc: 'เลือกประเภท template และกรอกข้อมูลตัวตนของบัญชี' },
            { step: '2', title: 'ตั้งค่าบัญชี', desc: 'ตั้งค่า customer ID, timezone, currency, version และขีดจำกัดแถว' },
            { step: '3', title: 'Export Functions', desc: 'เปิด/ปิดแต่ละ export job ขยายแต่ละแถวเพื่อตั้ง max rows, write mode และ lookback override' },
            { step: '4', title: 'ตั้งค่า Script', desc: 'กำหนด date range mode, write mode และ feature flags สำหรับ Google Ads Script' },
            { step: '5', title: 'ตั้งค่า Bridge', desc: 'ตั้งค่า Apps Script bridge หากใช้งาน ใช้ placeholder token เท่านั้น' },
            { step: '6', title: 'ตั้งค่า Dashboard', desc: 'กำหนดตัวเลือกการแสดงผลและเกณฑ์แจ้งเตือนสำหรับ dashboard' },
            { step: '7', title: 'สร้างไฟล์', desc: 'ดาวน์โหลด .xlsx หรือ .csv.zip แล้วคัดลอก code snippets สำหรับ script' },
          ].map(item => (
            <Box key={item.step} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Chip label={item.step} size="small" color="primary" sx={{ minWidth: 28 }} />
              <Box>
                <Typography variant="subtitle2">{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>กฎ GAQL Compatibility</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Sheet ที่สร้างขึ้นจะมี tab <code>_gaql_compatibility_matrix</code> ที่มีกฎที่ทราบ กฎสำคัญ:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 0 }}>
            {[
              'ห้าม select segments.asset_interaction_target.asset จาก resource asset_group',
              'ห้ามใช้ field ที่ไม่รู้จัก เช่น campaign_search_term_view.status',
              'ห้าม select campaign.* จาก resource change_event',
              'ห้าม select segments.geo_target_country จาก geographic_view',
              'ต้องจับคู่ GAQL fields กับ resource ที่ถูกต้องเสมอ',
            ].map((rule, i) => (
              <Typography component="li" variant="body2" color="text.secondary" key={i} sx={{ mb: 0.5 }}>{rule}</Typography>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>หมายเหตุด้านความปลอดภัย</Typography>
          <Box component="ul" sx={{ pl: 2, mt: 0 }}>
            {[
              'ไม่มีการสร้าง secret จริง — เขียนเพียง placeholder token ลงใน Sheet เท่านั้น',
              'ต้องแทนที่ BRIDGE_TOKEN_PLACEHOLDER ด้วย token จริงที่ปลอดภัยหลังคัดลอกไปยัง Google Sheets',
              'ไม่มีการส่งข้อมูลบัญชีไปยัง server ใด ๆ การประมวลผลทั้งหมดทำในเบราว์เซอร์ของคุณ',
              'ร่างถูกเก็บใน localStorage ของเบราว์เซอร์เท่านั้น ไม่มีการ sync ไปที่ใด',
              'Tabs ใน Sheet ไม่ถูกล็อกหรือป้องกัน — สามารถแก้ไขและทดสอบได้อิสระ',
            ].map((note, i) => (
              <Typography component="li" variant="body2" color="text.secondary" key={i} sx={{ mb: 0.5 }}>{note}</Typography>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Environment ที่รองรับ</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="test (ทดสอบ)" color="success" size="small" />
            <Chip label="staging (เตรียม production)" color="warning" size="small" />
            <Chip label="production (จริง)" color="error" size="small" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ควร build และทดสอบใน <strong>test</strong> เสมอก่อน
            เปลี่ยนเป็น <strong>production</strong> เมื่อผ่าน QA checklist ใน <code>_qa_checklist</code> ครบทุกข้อแล้วเท่านั้น
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
