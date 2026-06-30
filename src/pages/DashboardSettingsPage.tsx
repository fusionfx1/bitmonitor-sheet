import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import type { DraftConfig } from '../types';

interface Props {
  config: DraftConfig;
  onChange: (updates: Partial<DraftConfig>) => void;
}

export function DashboardSettingsPage({ config, onChange }: Props) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>ตั้งค่า Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          ตั้งค่า tab <code>_settings_dashboard</code> สำหรับตัวเลือกการแสดงผลและค่าเกณฑ์แจ้งเตือน
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Dashboard หลัก</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch size="small" checked={config.dashboardEnabled}
                    onChange={e => onChange({ dashboardEnabled: e.target.checked })} />
                }
                label={<Typography variant="body2">เปิดใช้งาน Dashboard</Typography>}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="ชื่อบัญชีใน Dashboard"
                value={config.dashboardAccountName}
                onChange={e => onChange({ dashboardAccountName: e.target.value })}
                helperText="ชื่อที่แสดงใน UI ของ Dashboard"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="รีเฟรชทุก (นาที)" type="number"
                value={config.dashboardRefreshIntervalMinutes}
                onChange={e => onChange({ dashboardRefreshIntervalMinutes: Number(e.target.value) })}
                inputProps={{ min: 5 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Cards และตารางที่แสดง</Typography>
          <Grid container spacing={1}>
            {([
              ['showLastSyncCard', 'แสดง Card สถานะ Sync ล่าสุด'],
              ['showScriptHealthCard', 'แสดง Card สุขภาพ Script'],
              ['showCampaignTable', 'แสดงตาราง Campaign'],
              ['showPmaxTable', 'แสดงตาราง PMax'],
              ['showSearchTermsTable', 'แสดงตาราง Search Terms'],
              ['showGeoTable', 'แสดงตาราง Geo'],
              ['showConversionTable', 'แสดงตาราง Conversion'],
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
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>เกณฑ์การแจ้งเตือน</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="แจ้งเตือนถ้า Sync เก่ากว่า (ชั่วโมง)" type="number"
                value={config.alertIfSyncOlderThanHours}
                onChange={e => onChange({ alertIfSyncOlderThanHours: Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="แจ้งเตือนถ้าจำนวน Error มากกว่า" type="number"
                value={config.alertIfScriptErrorCountGt}
                onChange={e => onChange({ alertIfScriptErrorCountGt: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="แจ้งเตือนถ้า Cost พุ่งเกิน %" type="number"
                value={config.alertIfCostSpikePercentGt}
                onChange={e => onChange({ alertIfCostSpikePercentGt: Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="แจ้งเตือนถ้า Conversion ลดเกิน %" type="number"
                value={config.alertIfConversionDropPercentGt}
                onChange={e => onChange({ alertIfConversionDropPercentGt: Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
