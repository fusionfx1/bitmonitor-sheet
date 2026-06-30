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
import Divider from '@mui/material/Divider';
import type { DraftConfig, DateRangeMode, WriteMode } from '../types';
import { TIMEZONES, CURRENCIES } from '../constants';

interface Props {
  config: DraftConfig;
  onChange: (updates: Partial<DraftConfig>) => void;
}

const DATE_RANGE_OPTIONS: DateRangeMode[] = ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'CUSTOM'];
const WRITE_MODES: WriteMode[] = ['append', 'overwrite', 'upsert'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export function AccountSettingsPage({ config, onChange }: Props) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>ตั้งค่าบัญชี</Typography>
        <Typography variant="body2" color="text.secondary">
          ค่าเหล่านี้จะถูกเขียนลงใน tab <code>_settings_global</code> และ <code>_settings_account</code> ของ Sheet ที่สร้างขึ้น
        </Typography>
      </Box>

      <Section title="ข้อมูลตัวตนบัญชี">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Account ID (ภายใน)" value={config.accountId}
              onChange={e => onChange({ accountId: e.target.value })} helperText="รหัสบัญชีภายในระบบ" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Customer ID" value={config.customerId}
              onChange={e => onChange({ customerId: e.target.value })} required helperText="Google Ads Customer ID" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="ชื่อบัญชี" value={config.accountName}
              onChange={e => onChange({ accountName: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="อีเมลเจ้าของ" value={config.ownerEmail} type="email"
              onChange={e => onChange({ ownerEmail: e.target.value })} />
          </Grid>
          {config.templateType === 'mcc_child' && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="MCC Parent Customer ID"
                value={config.mccParentCustomerId ?? ''}
                onChange={e => onChange({ mccParentCustomerId: e.target.value })}
                helperText="Customer ID ของบัญชี Manager/MCC หลัก" />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>เขตเวลา (Timezone)</InputLabel>
              <Select value={config.timezone} label="เขตเวลา (Timezone)" onChange={e => onChange({ timezone: e.target.value })}>
                {TIMEZONES.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>สกุลเงิน (Currency)</InputLabel>
              <Select value={config.currency} label="สกุลเงิน (Currency)" onChange={e => onChange({ currency: e.target.value })}>
                {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Section>

      <Section title="ข้อมูลเวอร์ชัน">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Sheet Version" value={config.sheetVersion}
              onChange={e => onChange({ sheetVersion: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Script Version" value={config.scriptVersion}
              onChange={e => onChange({ scriptVersion: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Ads API Version" value={config.adsApiVersion}
              onChange={e => onChange({ adsApiVersion: e.target.value })} helperText="เช่น v18" />
          </Grid>
        </Grid>
      </Section>

      <Section title="ขีดจำกัดจำนวนแถว">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Max Rows (ค่าเริ่มต้น)" type="number" value={config.maxRowsDefault}
              onChange={e => onChange({ maxRowsDefault: Number(e.target.value) })} inputProps={{ min: 100 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Max Rows PMax" type="number" value={config.maxRowsPmax}
              onChange={e => onChange({ maxRowsPmax: Number(e.target.value) })} inputProps={{ min: 100 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Max Rows Terms" type="number" value={config.maxRowsTerms}
              onChange={e => onChange({ maxRowsTerms: Number(e.target.value) })} inputProps={{ min: 100 }} />
          </Grid>
        </Grid>
      </Section>

      <Section title="การตั้งค่า Query">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="วันย้อนหลัง (Lookback Days)" type="number" value={config.lookbackDays}
              onChange={e => onChange({ lookbackDays: Number(e.target.value) })} inputProps={{ min: 1, max: 365 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>ช่วงวันที่ (Date Range Mode)</InputLabel>
              <Select value={config.dateRangeMode} label="ช่วงวันที่ (Date Range Mode)"
                onChange={e => onChange({ dateRangeMode: e.target.value as DateRangeMode })}>
                {DATE_RANGE_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>รูปแบบการเขียน (Write Mode)</InputLabel>
              <Select value={config.writeMode} label="รูปแบบการเขียน (Write Mode)"
                onChange={e => onChange({ writeMode: e.target.value as WriteMode })}>
                {WRITE_MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Section>

      <Section title="Feature Flags">
        <Grid container spacing={1}>
          {([
            ['includeZeroImpressions', 'รวมแถวที่ Impressions เป็นศูนย์'],
            ['includeRemovedEntities', 'รวม Campaign/Ad Group ที่ถูกลบแล้ว'],
            ['enableDebugLogs', 'เปิด Debug Logs'],
          ] as [keyof DraftConfig, string][]).map(([key, label]) => (
            <Grid size={{ xs: 12, sm: 6 }} key={key}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config[key] as boolean}
                    onChange={e => onChange({ [key]: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography variant="body2">{label}</Typography>}
              />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Divider />
    </Box>
  );
}
