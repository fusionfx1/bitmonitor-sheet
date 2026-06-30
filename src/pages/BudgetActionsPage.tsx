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
import Chip from '@mui/material/Chip';
import type { DraftConfig } from '../types';

interface Props {
  config: DraftConfig;
  onChange: (updates: Partial<DraftConfig>) => void;
}

export function BudgetActionsPage({ config, onChange }: Props) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Budget Actions</Typography>
        <Typography variant="body2" color="text.secondary">
          ตั้งค่า workflow ขอเพิ่ม/ลดงบแบบมี Owner Approval แยกจากระบบ reporting แบบ read-only
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        หน้านี้สร้าง policy และ request queue เท่านั้น ไม่ได้เพิ่มงบใน Google Ads และไม่เพิ่ม mutate code ให้ exporter
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="subtitle2">Owner Approval Policy</Typography>
            <Chip label="Request only" size="small" color="warning" variant="outlined" />
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config.budgetActionsEnabled}
                    onChange={e => onChange({ budgetActionsEnabled: e.target.checked })}
                  />
                }
                label={<Typography variant="body2">เปิด Budget Action Request Queue</Typography>}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config.budgetRequireOwnerApproval}
                    onChange={e => onChange({ budgetRequireOwnerApproval: e.target.checked })}
                  />
                }
                label={<Typography variant="body2">ต้องมี Owner Approval ทุกครั้ง</Typography>}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="เพิ่มงบได้สูงสุด (%)"
                type="number"
                value={config.budgetMaxIncreasePct}
                onChange={e => onChange({ budgetMaxIncreasePct: Number(e.target.value) })}
                inputProps={{ min: 1, max: 100 }}
                helperText="ค่า default แนะนำ 10%"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="ลดงบได้สูงสุด (%)"
                type="number"
                value={config.budgetMaxDecreasePct}
                onChange={e => onChange({ budgetMaxDecreasePct: Number(e.target.value) })}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Execution Mode</InputLabel>
                <Select
                  value={config.budgetExecutionMode}
                  label="Execution Mode"
                  onChange={e => onChange({ budgetExecutionMode: e.target.value as DraftConfig['budgetExecutionMode'] })}
                >
                  <MenuItem value="request_only">request_only</MenuItem>
                  <MenuItem value="external_owner_tool">external_owner_tool</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Owner Approval Contact"
                value={config.budgetOwnerApprovalContact}
                onChange={e => onChange({ budgetOwnerApprovalContact: e.target.value })}
                helperText="เช่น LINE, email, หรือชื่อผู้อนุมัติ"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Approved Execution Tool"
                value={config.budgetApprovedExecutionTool}
                onChange={e => onChange({ budgetApprovedExecutionTool: e.target.value })}
                helperText="เช่น Optmyzr, Owner Google Ads access, หรือ separate write tool"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Staff Flow</Typography>
          <Grid container spacing={2}>
            {[
              ['1', 'ดูข้อมูลจาก dashboard/raw tabs'],
              ['2', 'เพิ่มแถวใน _budget_action_requests'],
              ['3', 'ใส่เหตุผลและ evidence'],
              ['4', 'ตั้ง status = REQUESTED'],
              ['5', 'Owner approve/reject ใน _owner_approval_log'],
              ['6', 'ถ้า approved ค่อย execute ด้วย external owner tool'],
            ].map(([step, text]) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={step}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Step {step}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{text}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
