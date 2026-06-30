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
import type { DraftConfig, DateRangeMode, WriteMode } from '../types';

interface Props {
  config: DraftConfig;
  onChange: (updates: Partial<DraftConfig>) => void;
}

export function ScriptSettingsPage({ config, onChange }: Props) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>ตั้งค่า Script</Typography>
        <Typography variant="body2" color="text.secondary">
          ค่าเหล่านี้จะถูกใส่ใน tab <code>_settings_exporter</code> ซึ่ง Google Ads Script จะอ่านค่าจากที่นี่ตอน runtime
        </Typography>
      </Box>

      <Alert severity="success" sx={{ mb: 3 }}>
        Google Ads Script จะอ่านการตั้งค่าทั้งหมดจาก tab <code>_settings_exporter</code> ใน Sheet —
        ไม่จำเป็นต้องเขียน constants ใน script โดยตรง
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>การตั้งค่า Query</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ช่วงวันที่ (Date Range Mode)</InputLabel>
                <Select value={config.dateRangeMode} label="ช่วงวันที่ (Date Range Mode)"
                  onChange={e => onChange({ dateRangeMode: e.target.value as DateRangeMode })}>
                  {(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'CUSTOM'] as DateRangeMode[]).map(d =>
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="วันย้อนหลัง (Lookback Days)" type="number" value={config.lookbackDays}
                onChange={e => onChange({ lookbackDays: Number(e.target.value) })}
                helperText="ใช้เมื่อ DATE_RANGE_MODE = CUSTOM" inputProps={{ min: 1, max: 365 }} />
            </Grid>
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>รูปแบบการเขียน (Write Mode)</InputLabel>
                <Select value={config.writeMode} label="รูปแบบการเขียน (Write Mode)"
                  onChange={e => onChange({ writeMode: e.target.value as WriteMode })}>
                  <MenuItem value="overwrite">overwrite</MenuItem>
                  <MenuItem value="append">append</MenuItem>
                  <MenuItem value="upsert">upsert</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Ads API Version" value={config.adsApiVersion}
                onChange={e => onChange({ adsApiVersion: e.target.value })} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>สวิตช์ Export</Typography>
          <Grid container spacing={1}>
            {([
              ['includeZeroImpressions', 'รวมแถวที่ Impressions เป็นศูนย์'],
              ['includeRemovedEntities', 'รวม Campaign/Ad Group ที่ถูกลบแล้ว'],
              ['enableDebugLogs', 'เปิด Debug Logs'],
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
    </Box>
  );
}
