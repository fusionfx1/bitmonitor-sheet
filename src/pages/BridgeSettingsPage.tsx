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
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import type { DraftConfig } from '../types';

interface Props {
  config: DraftConfig;
  onChange: (updates: Partial<DraftConfig>) => void;
}

export function BridgeSettingsPage({ config, onChange }: Props) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>ตั้งค่า Bridge</Typography>
        <Typography variant="body2" color="text.secondary">
          ตั้งค่า tab <code>_settings_bridge</code> ไม่มีการสร้าง secret จริง — ใช้ placeholder เท่านั้น
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        ค่า <strong>BRIDGE_TOKEN_PLACEHOLDER</strong> เป็นเพียง placeholder เท่านั้น
        ต้องเปลี่ยนเป็น token จริงของคุณหลังจากคัดลอกไปยัง Google Sheets
        ห้ามนำ token จริงไปฝังใน version control ใด ๆ โดยเด็ดขาด
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Bridge หลัก</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch size="small" checked={config.bridgeEnabled}
                    onChange={e => onChange({ bridgeEnabled: e.target.checked })} />
                }
                label={<Typography variant="body2">เปิดใช้งาน Bridge</Typography>}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>โหมดนำเข้าข้อมูล (Import Mode)</InputLabel>
                <Select value={config.dashboardImportMode} label="โหมดนำเข้าข้อมูล (Import Mode)"
                  onChange={e => onChange({ dashboardImportMode: e.target.value })}>
                  <MenuItem value="pull">pull (ดึงข้อมูล)</MenuItem>
                  <MenuItem value="push">push (ส่งข้อมูล)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Bridge Token Placeholder"
                value={config.bridgeTokenPlaceholder}
                onChange={e => onChange({ bridgeTokenPlaceholder: e.target.value })}
                helperText="Placeholder เท่านั้น — ให้เปลี่ยนเป็น token จริงใน Google Sheets"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Bridge Endpoint URL"
                value={config.bridgeEndpointUrl}
                onChange={e => onChange({ bridgeEndpointUrl: e.target.value })}
                helperText="URL ของ Apps Script web app ที่ deploy แล้ว"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>ฟีเจอร์ Endpoint</Typography>
          <Grid container spacing={1}>
            {([
              ['allowGet', 'อนุญาต GET Request'],
              ['allowPost', 'อนุญาต POST Request'],
              ['enableHealthEndpoint', 'เปิด Health Endpoint'],
              ['enableCsvExport', 'เปิด CSV Export'],
              ['enableJsonExport', 'เปิด JSON Export'],
              ['enableCache', 'เปิด Cache ผลลัพธ์'],
              ['logBridgeRequests', 'บันทึก Log ทุก Bridge Request'],
            ] as [keyof DraftConfig, string][]).map(([key, label]) => (
              <Grid size={{ xs: 12, sm: 6 }} key={key}>
                <FormControlLabel
                  control={
                    <Switch size="small" checked={config[key] as boolean}
                      onChange={e => onChange({ [key]: e.target.checked })} />
                  }
                  label={<Typography variant="body2">{label}</Typography>}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 2 }}>
            <TextField size="small" label="Cache TTL (วินาที)" type="number"
              value={config.cacheSeconds}
              onChange={e => onChange({ cacheSeconds: Number(e.target.value) })}
              disabled={!config.enableCache}
              inputProps={{ min: 0 }}
              sx={{ width: 200 }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
