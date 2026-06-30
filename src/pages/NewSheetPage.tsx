import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import type { DraftConfig, TemplateType, Environment } from '../types';
import { TIMEZONES, CURRENCIES } from '../constants';

interface Props {
  config: DraftConfig;
  onChange: (updates: Partial<DraftConfig>) => void;
  onSaveDraft: () => void;
}

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: 'google_ads_account', label: 'Google Ads Account Sheet', description: 'บัญชีมาตรฐาน เปิดใช้งาน export jobs ทั้งหมด' },
  { value: 'test_account', label: 'Test Account Sheet', description: 'สภาพแวดล้อมทดสอบ เปิด exports และ debug logs ทั้งหมด' },
  { value: 'mcc_child', label: 'Manager/MCC Child Account Sheet', description: 'บัญชีลูกภายใต้ MCC ตั้งค่าสำหรับ child-level exports' },
  { value: 'empty_developer', label: 'Empty Developer Sheet', description: 'Sheet เปล่า ไม่มี export jobs — สำหรับพัฒนา script' },
];

const ENV_OPTIONS: { value: Environment; label: string }[] = [
  { value: 'test', label: 'ทดสอบ (Test)' },
  { value: 'staging', label: 'เตรียมขึ้น Production (Staging)' },
  { value: 'production', label: 'Production จริง' },
];

export function NewSheetPage({ config, onChange, onSaveDraft }: Props) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>สร้าง Sheet ใหม่</Typography>
        <Typography variant="body2" color="text.secondary">
          ตั้งค่า Google Sheet template แบบแยกเดี่ยวสำหรับบัญชี Google Ads หนึ่งบัญชี
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>นโยบายการแยก Sheet:</strong> บัญชี Google Ads แต่ละบัญชีต้องมี Sheet ของตัวเองแยกกัน
        ห้ามใช้ Sheet เดียวกันข้ามหลายบัญชีโดยเด็ดขาด
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>ประเภท Template</Typography>
          <Grid container spacing={2}>
            {TEMPLATE_OPTIONS.map(opt => (
              <Grid size={{ xs: 12, sm: 6 }} key={opt.value}>
                <Box
                  onClick={() => onChange({ templateType: opt.value })}
                  sx={{
                    p: 2,
                    border: 2,
                    borderRadius: 1,
                    cursor: 'pointer',
                    borderColor: config.templateType === opt.value ? 'primary.main' : 'divider',
                    bgcolor: config.templateType === opt.value ? 'primary.50' : 'background.paper',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Typography variant="subtitle2" color={config.templateType === opt.value ? 'primary.main' : 'text.primary'}>
                    {opt.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{opt.description}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>ข้อมูลบัญชี</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="ชื่อย่อบัญชี (Nickname)"
                size="small"
                value={config.accountNickname}
                onChange={e => onChange({ accountNickname: e.target.value })}
                helperText="ชื่อสั้นสำหรับใช้ในชื่อไฟล์และ README"
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Google Ads Customer ID"
                size="small"
                value={config.customerId}
                onChange={e => onChange({ customerId: e.target.value })}
                helperText="เช่น 123-456-7890"
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>เขตเวลา (Timezone)</InputLabel>
                <Select
                  value={config.timezone}
                  label="เขตเวลา (Timezone)"
                  onChange={e => onChange({ timezone: e.target.value })}
                >
                  {TIMEZONES.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>สกุลเงิน (Currency)</InputLabel>
                <Select
                  value={config.currency}
                  label="สกุลเงิน (Currency)"
                  onChange={e => onChange({ currency: e.target.value })}
                >
                  {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="อีเมลเจ้าของ Sheet"
                size="small"
                type="email"
                value={config.ownerEmail}
                onChange={e => onChange({ ownerEmail: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>สภาพแวดล้อม (Environment)</InputLabel>
                <Select
                  value={config.environment}
                  label="สภาพแวดล้อม (Environment)"
                  onChange={e => onChange({ environment: e.target.value as Environment })}
                >
                  {ENV_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {config.environment === 'production' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>เลือก Production แล้ว</strong> ตรวจสอบการตั้งค่าทั้งหมดให้ครบถ้วนก่อน deploy script
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>การตั้งค่า Sheet</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="ชื่อโปรเจกต์ Dashboard"
                size="small"
                value={config.dashboardProjectName}
                onChange={e => onChange({ dashboardProjectName: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="จำนวนวันย้อนหลัง (Lookback Days)"
                size="small"
                type="number"
                value={config.lookbackDays}
                onChange={e => onChange({ lookbackDays: Number(e.target.value) })}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="หมายเหตุตารางเวลา Export"
                size="small"
                value={config.exportScheduleNote}
                onChange={e => onChange({ exportScheduleNote: e.target.value })}
                helperText="บันทึกช่วยจำเกี่ยวกับเวลาที่ script จะทำงาน"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" startIcon={<AddCircleIcon />} onClick={onSaveDraft}>
          บันทึกร่าง
        </Button>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={config.environment.toUpperCase()}
            size="small"
            color={config.environment === 'production' ? 'error' : config.environment === 'staging' ? 'warning' : 'success'}
          />
          {config.accountNickname && (
            <Chip label={config.accountNickname} size="small" variant="outlined" />
          )}
          {config.customerId && (
            <Chip label={`CID: ${config.customerId}`} size="small" variant="outlined" />
          )}
        </Box>
      </Box>
    </Box>
  );
}
